import { eq, hazardEvents, ingestionRuns } from "@hazardwatch/db";
import { describe, expect, it } from "vitest";

import { createIngestionRepository } from "./repository.js";
import type { IngestedEvent } from "./sources/index.js";
import { useTestDatabase } from "./testing/database.js";

const db = useTestDatabase();
const repository = createIngestionRepository(db);

function earthquake(overrides: Partial<IngestedEvent> = {}): IngestedEvent {
  return {
    source: "usgs",
    externalId: "us7000test",
    kind: "earthquake",
    severity: "moderate",
    title: "M 5.2 - 20 km S of Lisbon, Portugal",
    location: { x: -9.14, y: 38.54 },
    occurredAt: new Date("2026-11-17T08:00:00Z"),
    activeUntil: new Date("2026-11-17T08:00:00Z"),
    sourceUpdatedAt: new Date("2026-11-17T08:05:00Z"),
    ...overrides,
  };
}

describe("upsertEvents", () => {
  it("inserts new events", async () => {
    const written = await repository.upsertEvents([
      earthquake(),
      earthquake({ externalId: "us7000other" }),
    ]);

    expect(written).toBe(2);
    expect(await db.$count(hazardEvents)).toBe(2);
  });

  it("leaves unchanged events alone", async () => {
    await repository.upsertEvents([earthquake()]);

    const written = await repository.upsertEvents([earthquake()]);

    expect(written).toBe(0);
  });

  it("updates revised events in place", async () => {
    await repository.upsertEvents([earthquake()]);

    const written = await repository.upsertEvents([
      earthquake({
        severity: "severe",
        title: "M 6.1 - 20 km S of Lisbon, Portugal",
        sourceUpdatedAt: new Date("2026-11-17T08:30:00Z"),
      }),
    ]);

    expect(written).toBe(1);
    const rows = await db.select().from(hazardEvents);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      severity: "severe",
      title: "M 6.1 - 20 km S of Lisbon, Portugal",
    });
  });

  it("always rewrites events from sources without revision times", async () => {
    await repository.upsertEvents([earthquake({ sourceUpdatedAt: null })]);

    const written = await repository.upsertEvents([earthquake({ sourceUpdatedAt: null })]);

    expect(written).toBe(1);
  });

  it("writes large feeds in several batches", async () => {
    const events = Array.from({ length: 1_201 }, (_, index) =>
      earthquake({ externalId: `us7000batch${index}` }),
    );

    const written = await repository.upsertEvents(events);

    expect(written).toBe(1_201);
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
