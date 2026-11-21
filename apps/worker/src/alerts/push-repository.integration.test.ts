import {
  createDb,
  hazardEvents,
  pushSubscriptions,
  user,
  watchZones,
  zoneAlerts,
} from "@hazardwatch/db";
import { afterAll, describe, expect, inject, it } from "vitest";

import { createIngestionRepository } from "../repository.js";
import type { IngestedEvent } from "../sources/index.js";
import { useTestDatabase } from "../testing/database.js";
import { createAlertPushRepository } from "./push-repository.js";

const db = useTestDatabase();
const repository = createAlertPushRepository(db);

// A second worker, with its own connection to the database.
const otherDb = createDb(inject("databaseUrl"), { maxConnections: 1 });
const otherWorker = createAlertPushRepository(otherDb);
afterAll(async () => {
  await otherDb.$client.end();
});

const MINUTE_MS = 60 * 1000;
const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * MINUTE_MS);

interface Fixture {
  subscribed?: boolean;
  raisedAt?: Date;
  readAt?: Date | null;
  pushedAt?: Date | null;
}

let sequence = 0;

/** A browser subscribed for the user, with a unique endpoint. */
async function subscribe(userId: string) {
  sequence += 1;
  const [subscription] = await db
    .insert(pushSubscriptions)
    .values({
      userId,
      endpoint: `https://push.example.test/${sequence}`,
      p256dh: `key-${sequence}`,
      auth: `secret-${sequence}`,
    })
    .returning();
  if (!subscription) {
    throw new Error("Failed to create the subscription");
  }
  return subscription;
}

/** An alert for a new user, zone and event, waiting to be pushed unless told otherwise. */
async function createAlert({
  subscribed = true,
  raisedAt = minutesAgo(5),
  readAt = null,
  pushedAt = null,
}: Fixture = {}) {
  sequence += 1;
  const userId = `user-${sequence}`;
  await db.insert(user).values({ id: userId, name: `User ${sequence}`, email: `${userId}@x.test` });
  const [zone] = await db
    .insert(watchZones)
    .values({ userId, name: `Zone ${sequence}`, center: { x: 0, y: 0 }, radiusKm: 100 })
    .returning();
  const [event] = await db
    .insert(hazardEvents)
    .values({
      source: "usgs",
      externalId: `event-${sequence}`,
      kind: "earthquake",
      severity: "severe",
      title: `Event ${sequence}`,
      location: { x: 0, y: 0 },
      occurredAt: raisedAt,
      activeUntil: raisedAt,
    })
    .returning();
  if (!zone || !event) {
    throw new Error("Failed to create the fixture");
  }
  const [alert] = await db
    .insert(zoneAlerts)
    .values({ zoneId: zone.id, eventId: event.id, severity: "severe", raisedAt, readAt, pushedAt })
    .returning();
  if (!alert) {
    throw new Error("Failed to create the alert");
  }
  if (subscribed) {
    await subscribe(userId);
  }
  return { userId, zone, event, alert };
}

describe("claimPending", () => {
  it("hands out the alerts waiting to be pushed, with what the notification needs", async () => {
    const { userId, zone, event, alert } = await createAlert();

    expect(await repository.claimPending()).toEqual([
      {
        alertId: alert.id,
        userId,
        zoneId: zone.id,
        zoneName: zone.name,
        eventId: event.id,
        eventTitle: event.title,
        severity: "severe",
      },
    ]);
  });

  it("hands out each alert once", async () => {
    await createAlert();
    await repository.claimPending();

    expect(await repository.claimPending()).toEqual([]);
  });

  it("lists the most recent alerts first", async () => {
    const older = await createAlert({ raisedAt: minutesAgo(30) });
    const newer = await createAlert({ raisedAt: minutesAgo(10) });

    const claimed = await repository.claimPending();

    expect(claimed.map((alert) => alert.alertId)).toEqual([newer.alert.id, older.alert.id]);
  });

  it.each<[string, Fixture]>([
    ["users without a browser to push to", { subscribed: false }],
    ["alerts read in the app", { readAt: minutesAgo(1) }],
    ["alerts raised more than an hour ago", { raisedAt: minutesAgo(61) }],
    ["alerts already pushed", { pushedAt: minutesAgo(1) }],
  ])("leaves out %s", async (_case, fixture) => {
    await createAlert(fixture);

    expect(await repository.claimPending()).toEqual([]);
  });

  it("claims the alerts of a user who subscribes later", async () => {
    const { userId, alert } = await createAlert({ subscribed: false });
    expect(await repository.claimPending()).toEqual([]);

    await subscribe(userId);

    expect((await repository.claimPending()).map((claimed) => claimed.alertId)).toEqual([alert.id]);
  });

  it("never hands the same alert to two workers", async () => {
    for (let index = 0; index < 20; index++) {
      await createAlert();
    }

    const [first, second] = await Promise.all([
      repository.claimPending(),
      otherWorker.claimPending(),
    ]);
    const ids = [...first, ...second].map((alert) => alert.alertId);

    expect(ids).toHaveLength(20);
    expect(new Set(ids).size).toBe(20);
  });
});

describe("release", () => {
  it("puts alerts back in the queue", async () => {
    const { alert } = await createAlert();
    await repository.claimPending();

    await repository.release([alert.id]);

    expect((await repository.claimPending()).map((claimed) => claimed.alertId)).toEqual([alert.id]);
  });
});

describe("targets", () => {
  it("lists the browsers of the given users only", async () => {
    const { userId } = await createAlert();
    const second = await subscribe(userId);
    await createAlert();

    const targets = await repository.listTargets([userId]);

    expect(targets).toHaveLength(2);
    expect(targets).toContainEqual({
      id: second.id,
      userId,
      endpoint: second.endpoint,
      p256dh: second.p256dh,
      auth: second.auth,
    });
  });

  it("forgets the given browsers", async () => {
    const { userId } = await createAlert({ subscribed: false });
    const gone = await subscribe(userId);
    const kept = await subscribe(userId);

    await repository.removeTargets([gone.id]);

    expect((await repository.listTargets([userId])).map((target) => target.id)).toEqual([kept.id]);
  });
});

describe("raising an alert again", () => {
  it("pushes it again", async () => {
    const ingestion = createIngestionRepository(db);
    await db.insert(user).values({ id: "ada", name: "Ada", email: "ada@example.test" });
    await subscribe("ada");
    await db.insert(watchZones).values({
      userId: "ada",
      name: "Lisbon",
      center: { x: -9.14, y: 38.72 },
      radiusKm: 100,
    });
    const earthquake: IngestedEvent = {
      source: "usgs",
      externalId: "us7000test",
      kind: "earthquake",
      severity: "moderate",
      title: "M 5.2 - 20 km S of Lisbon, Portugal",
      location: { x: -9.14, y: 38.54 },
      occurredAt: minutesAgo(20),
      activeUntil: minutesAgo(20),
      sourceUpdatedAt: minutesAgo(10),
    };
    await ingestion.upsertEvents([earthquake]);
    expect(await repository.claimPending()).toHaveLength(1);

    await ingestion.upsertEvents([
      { ...earthquake, severity: "severe", sourceUpdatedAt: minutesAgo(5) },
    ]);

    expect(await repository.claimPending()).toEqual([
      expect.objectContaining({ userId: "ada", severity: "severe" }),
    ]);
  });
});
