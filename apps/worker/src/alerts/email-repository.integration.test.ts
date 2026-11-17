import { createDb, hazardEvents, user, watchZones, zoneAlerts } from "@hazardwatch/db";
import { afterAll, describe, expect, inject, it } from "vitest";

import { createIngestionRepository } from "../repository.js";
import type { IngestedEvent } from "../sources/index.js";
import { useTestDatabase } from "../testing/database.js";
import { createAlertEmailRepository } from "./email-repository.js";

const db = useTestDatabase();
const repository = createAlertEmailRepository(db);

// A second worker, with its own connection to the database.
const otherDb = createDb(inject("databaseUrl"), { maxConnections: 1 });
const otherWorker = createAlertEmailRepository(otherDb);
afterAll(async () => {
  await otherDb.$client.end();
});

const HOUR_MS = 60 * 60 * 1000;
const hoursAgo = (hours: number) => new Date(Date.now() - hours * HOUR_MS);

interface Fixture {
  verified?: boolean;
  emailAlerts?: boolean;
  raisedAt?: Date;
  readAt?: Date | null;
  emailedAt?: Date | null;
}

let sequence = 0;

/** An alert for a new user, zone and event, waiting to be emailed unless told otherwise. */
async function createAlert({
  verified = true,
  emailAlerts = true,
  raisedAt = hoursAgo(1),
  readAt = null,
  emailedAt = null,
}: Fixture = {}) {
  sequence += 1;
  const userId = `user-${sequence}`;
  const userName = `User ${sequence}`;
  await db.insert(user).values({
    id: userId,
    name: userName,
    email: `${userId}@example.test`,
    emailVerified: verified,
  });
  const [zone] = await db
    .insert(watchZones)
    .values({
      userId,
      name: `Zone ${sequence}`,
      center: { x: 0, y: 0 },
      radiusKm: 100,
      emailAlerts,
    })
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
    .values({ zoneId: zone.id, eventId: event.id, severity: "severe", raisedAt, readAt, emailedAt })
    .returning();
  if (!alert) {
    throw new Error("Failed to create the alert");
  }
  return { userId, userName, zone, event, alert };
}

describe("claimPending", () => {
  it("hands out the alerts waiting to be emailed, with what the email needs", async () => {
    const { userId, userName, zone, event, alert } = await createAlert();

    expect(await repository.claimPending()).toEqual([
      {
        alertId: alert.id,
        userId,
        userName,
        userEmail: `${userId}@example.test`,
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
    const older = await createAlert({ raisedAt: hoursAgo(3) });
    const newer = await createAlert({ raisedAt: hoursAgo(1) });

    const claimed = await repository.claimPending();

    expect(claimed.map((alert) => alert.alertId)).toEqual([newer.alert.id, older.alert.id]);
  });

  it.each<[string, Fixture]>([
    ["unconfirmed addresses", { verified: false }],
    ["zones with email alerts off", { emailAlerts: false }],
    ["alerts read in the app", { readAt: hoursAgo(0.5) }],
    ["alerts raised more than a day ago", { raisedAt: hoursAgo(25) }],
    ["alerts already emailed", { emailedAt: hoursAgo(0.5) }],
  ])("leaves out %s", async (_case, fixture) => {
    await createAlert(fixture);

    expect(await repository.claimPending()).toEqual([]);
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

describe("raising an alert again", () => {
  it("emails it again", async () => {
    const ingestion = createIngestionRepository(db);
    await db
      .insert(user)
      .values({ id: "ada", name: "Ada", email: "ada@example.test", emailVerified: true });
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
      occurredAt: hoursAgo(2),
      activeUntil: hoursAgo(2),
      sourceUpdatedAt: hoursAgo(1),
    };
    await ingestion.upsertEvents([earthquake]);
    expect(await repository.claimPending()).toHaveLength(1);

    await ingestion.upsertEvents([
      { ...earthquake, severity: "severe", sourceUpdatedAt: hoursAgo(0.5) },
    ]);

    expect(await repository.claimPending()).toEqual([
      expect.objectContaining({ userEmail: "ada@example.test", severity: "severe" }),
    ]);
  });
});
