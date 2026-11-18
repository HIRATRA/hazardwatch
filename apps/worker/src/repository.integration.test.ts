import {
  eq,
  hazardEvents,
  ingestionRuns,
  user,
  watchZones,
  zoneAlerts,
  type NewWatchZone,
} from "@hazardwatch/db";
import { describe, expect, it } from "vitest";

import { createIngestionRepository } from "./repository.js";
import type { IngestedEvent } from "./sources/index.js";
import { useTestDatabase } from "./testing/database.js";

const db = useTestDatabase();
const repository = createIngestionRepository(db);

const HOUR_MS = 60 * 60 * 1000;
const hoursAgo = (hours: number) => new Date(Date.now() - hours * HOUR_MS);

/** A moderate earthquake 20 km south of Lisbon, two hours ago. */
function earthquake(overrides: Partial<IngestedEvent> = {}): IngestedEvent {
  return {
    source: "usgs",
    externalId: "us7000test",
    kind: "earthquake",
    severity: "moderate",
    title: "M 5.2 - 20 km S of Lisbon, Portugal",
    location: { x: -9.14, y: 38.54 },
    occurredAt: hoursAgo(2),
    activeUntil: hoursAgo(2),
    sourceUpdatedAt: hoursAgo(1),
    ...overrides,
  };
}

/** A zone of 100 km around Lisbon with the default alert threshold. */
async function createZone(overrides: Partial<NewWatchZone> = {}) {
  const userId = overrides.userId ?? "user-1";
  await db
    .insert(user)
    .values({ id: userId, name: "Ada", email: `${userId}@example.test` })
    .onConflictDoNothing();
  const [zone] = await db
    .insert(watchZones)
    .values({ name: "Lisbon", center: { x: -9.14, y: 38.72 }, radiusKm: 100, ...overrides, userId })
    .returning();
  if (!zone) {
    throw new Error("Failed to create the zone");
  }
  return zone;
}

describe("upsertEvents", () => {
  it("inserts new events", async () => {
    const result = await repository.upsertEvents([
      earthquake(),
      earthquake({ externalId: "us7000other" }),
    ]);

    expect(result.eventsUpserted).toBe(2);
    expect(await db.$count(hazardEvents)).toBe(2);
  });

  it("leaves unchanged events alone", async () => {
    const event = earthquake();
    await repository.upsertEvents([event]);

    const result = await repository.upsertEvents([event]);

    expect(result.eventsUpserted).toBe(0);
  });

  it("updates revised events in place", async () => {
    await repository.upsertEvents([earthquake()]);

    const result = await repository.upsertEvents([
      earthquake({
        severity: "severe",
        title: "M 6.1 - 20 km S of Lisbon, Portugal",
        sourceUpdatedAt: hoursAgo(0.5),
      }),
    ]);

    expect(result.eventsUpserted).toBe(1);
    const rows = await db.select().from(hazardEvents);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      severity: "severe",
      title: "M 6.1 - 20 km S of Lisbon, Portugal",
    });
  });

  it("always rewrites events from sources without revision times", async () => {
    await repository.upsertEvents([earthquake({ sourceUpdatedAt: null })]);

    const result = await repository.upsertEvents([earthquake({ sourceUpdatedAt: null })]);

    expect(result.eventsUpserted).toBe(1);
  });

  it("writes large feeds in several batches", async () => {
    const events = Array.from({ length: 1_201 }, (_, index) =>
      earthquake({ externalId: `us7000batch${index}` }),
    );

    const result = await repository.upsertEvents(events);

    expect(result.eventsUpserted).toBe(1_201);
  });
});

describe("alerts", () => {
  it("raises an alert when an event reaches a zone at its threshold", async () => {
    const zone = await createZone({ alertMinSeverity: "moderate" });

    const result = await repository.upsertEvents([earthquake()]);

    expect(result.alertsRaised).toBe(1);
    const alerts = await db.select().from(zoneAlerts);
    expect(alerts).toEqual([
      expect.objectContaining({ zoneId: zone.id, severity: "moderate", readAt: null }),
    ]);
  });

  it("starts new zones at the moderate threshold", async () => {
    const zone = await createZone();

    expect(zone.alertMinSeverity).toBe("moderate");
  });

  it("ignores events below the threshold", async () => {
    await createZone({ alertMinSeverity: "severe" });

    const result = await repository.upsertEvents([earthquake({ severity: "moderate" })]);

    expect(result.alertsRaised).toBe(0);
  });

  it("ignores zones with alerts turned off", async () => {
    await createZone({ alertMinSeverity: null });

    const result = await repository.upsertEvents([earthquake({ severity: "extreme" })]);

    expect(result.alertsRaised).toBe(0);
  });

  it("ignores events outside the zone", async () => {
    await createZone();

    // Porto is about 270 km north of Lisbon.
    const result = await repository.upsertEvents([
      earthquake({ location: { x: -8.61, y: 41.15 } }),
    ]);

    expect(result.alertsRaised).toBe(0);
  });

  it("alerts every zone the event reaches", async () => {
    await createZone({ userId: "user-1" });
    await createZone({ userId: "user-2", name: "Setúbal", center: { x: -8.89, y: 38.52 } });

    const result = await repository.upsertEvents([earthquake()]);

    expect(result.alertsRaised).toBe(2);
  });

  it("raises an alert once per zone and event", async () => {
    await createZone();
    await repository.upsertEvents([earthquake({ sourceUpdatedAt: null })]);

    const result = await repository.upsertEvents([earthquake({ sourceUpdatedAt: null })]);

    expect(result).toEqual({ eventsUpserted: 1, alertsRaised: 0 });
    expect(await db.$count(zoneAlerts)).toBe(1);
  });

  it("raises the alert again, unread, when the event grows more severe", async () => {
    await createZone();
    await repository.upsertEvents([earthquake({ severity: "moderate" })]);
    const [first] = await db.update(zoneAlerts).set({ readAt: new Date() }).returning();

    const result = await repository.upsertEvents([
      earthquake({ severity: "severe", sourceUpdatedAt: hoursAgo(0.5) }),
    ]);

    expect(result.alertsRaised).toBe(1);
    const [alert] = await db.select().from(zoneAlerts);
    expect(alert).toMatchObject({ id: first?.id, severity: "severe", readAt: null });
    expect(alert?.raisedAt.getTime()).toBeGreaterThan(first?.raisedAt.getTime() ?? Infinity);
  });

  it("keeps the alert as it was when the event becomes less severe", async () => {
    await createZone();
    await repository.upsertEvents([earthquake({ severity: "severe" })]);

    const result = await repository.upsertEvents([
      earthquake({ severity: "moderate", sourceUpdatedAt: hoursAgo(0.5) }),
    ]);

    expect(result.alertsRaised).toBe(0);
    const [alert] = await db.select().from(zoneAlerts);
    expect(alert?.severity).toBe("severe");
  });

  it("stays quiet about events that ended more than a day ago", async () => {
    await createZone();

    // GDACS keeps revising cyclones long after they faded.
    const result = await repository.upsertEvents([
      earthquake({ occurredAt: hoursAgo(24 * 10), activeUntil: hoursAgo(30) }),
    ]);

    expect(result.alertsRaised).toBe(0);
  });

  it("alerts about lasting events that are still going on", async () => {
    await createZone();

    const result = await repository.upsertEvents([
      earthquake({
        source: "gdacs",
        externalId: "FL-1103001",
        kind: "flood",
        occurredAt: hoursAgo(24 * 20),
        activeUntil: new Date(Date.now() + 24 * HOUR_MS),
      }),
    ]);

    expect(result.alertsRaised).toBe(1);
  });

  it("deletes alerts along with their zone", async () => {
    const zone = await createZone();
    await repository.upsertEvents([earthquake()]);

    await db.delete(watchZones).where(eq(watchZones.id, zone.id));

    expect(await db.$count(zoneAlerts)).toBe(0);
  });
});

describe("windowed sources", () => {
  /** Fire activity 20 km south of Lisbon, as a 24-hour window shows it. */
  function fire(occurredAt: Date, activeUntil: Date): IngestedEvent {
    return earthquake({
      source: "nasa_firms",
      externalId: "cell-516-2333",
      kind: "wildfire",
      title: "Fire seen by satellite",
      occurredAt,
      activeUntil,
      sourceUpdatedAt: null,
    });
  }

  async function storedPeriod() {
    const [event] = await db.select().from(hazardEvents);
    return { occurredAt: event?.occurredAt, activeUntil: event?.activeUntil };
  }

  it("keeps the start of an event that goes on", async () => {
    const start = hoursAgo(30);
    await repository.upsertEvents([fire(start, hoursAgo(10))], { windowed: true });

    // The window moved on and no longer shows the first detections.
    const end = hoursAgo(1);
    await repository.upsertEvents([fire(hoursAgo(20), end)], { windowed: true });

    expect(await storedPeriod()).toEqual({ occurredAt: start, activeUntil: end });
  });

  it("starts the event again after a long silence", async () => {
    await repository.upsertEvents([fire(hoursAgo(24 * 30), hoursAgo(24 * 29))], {
      windowed: true,
    });

    const restart = hoursAgo(5);
    await repository.upsertEvents([fire(restart, hoursAgo(1))], { windowed: true });

    expect((await storedPeriod()).occurredAt).toEqual(restart);
  });

  it("takes the reported start as is from other sources", async () => {
    await repository.upsertEvents([fire(hoursAgo(30), hoursAgo(10))]);

    const reported = hoursAgo(20);
    await repository.upsertEvents([fire(reported, hoursAgo(1))]);

    expect((await storedPeriod()).occurredAt).toEqual(reported);
  });

  it("raises the alert once while the event goes on", async () => {
    await createZone();
    await repository.upsertEvents([fire(hoursAgo(30), hoursAgo(10))], { windowed: true });

    const result = await repository.upsertEvents([fire(hoursAgo(20), hoursAgo(1))], {
      windowed: true,
    });

    expect(result.alertsRaised).toBe(0);
  });

  it("raises the alert again, unread, when the event starts again", async () => {
    await createZone();
    await repository.upsertEvents([fire(hoursAgo(5), hoursAgo(1))], { windowed: true });
    // Ten days pass: the alert is read and the fire died down.
    await db.update(zoneAlerts).set({ raisedAt: hoursAgo(24 * 10), readAt: hoursAgo(24 * 10) });
    await db
      .update(hazardEvents)
      .set({ occurredAt: hoursAgo(24 * 11), activeUntil: hoursAgo(24 * 10) });

    const result = await repository.upsertEvents([fire(hoursAgo(3), hoursAgo(1))], {
      windowed: true,
    });

    expect(result.alertsRaised).toBe(1);
    const [alert] = await db.select().from(zoneAlerts);
    expect(alert?.readAt).toBeNull();
  });
});

describe("runs", () => {
  it("records the outcome of a run", async () => {
    const runId = await repository.startRun("usgs");
    await repository.finishRun(runId, { status: "failed", eventsUpserted: 0, error: "timeout" });

    const [run] = await db.select().from(ingestionRuns).where(eq(ingestionRuns.id, runId));
    expect(run).toMatchObject({ source: "usgs", status: "failed", error: "timeout" });
    expect(run?.finishedAt).toBeInstanceOf(Date);
  });
});
