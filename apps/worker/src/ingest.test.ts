import { pino } from "pino";
import { describe, expect, it, vi } from "vitest";

import { ingestSource } from "./ingest.js";
import type { IngestionRepository, RunResult, UpsertOptions } from "./repository.js";
import type { IngestedEvent, Source } from "./sources/index.js";

const logger = pino({ level: "silent" });

const event: IngestedEvent = {
  source: "usgs",
  externalId: "us7000abcd",
  kind: "earthquake",
  severity: "moderate",
  title: "M 5.1 - 10 km S of Somewhere",
  location: { x: 23.32, y: 42.69 },
  occurredAt: new Date("2026-01-01T00:00:00Z"),
  activeUntil: new Date("2026-01-01T00:00:00Z"),
};

function createFakeRepository() {
  const finished: RunResult[] = [];
  const upsertEvents = vi.fn((events: readonly IngestedEvent[], _options?: UpsertOptions) =>
    Promise.resolve({ eventsUpserted: events.length, alertsRaised: 0 }),
  );
  const repository: IngestionRepository = {
    startRun: vi.fn(() => Promise.resolve("run-1")),
    finishRun: vi.fn((_runId: string, result: RunResult) => {
      finished.push(result);
      return Promise.resolve();
    }),
    upsertEvents,
  };
  return { repository, upsertEvents, finished };
}

function createSource(fetchEvents: Source["fetchEvents"]): Source {
  return { id: "usgs", intervalMs: 60_000, fetchEvents };
}

describe("ingestSource", () => {
  it("upserts fetched events and records a successful run", async () => {
    const { repository, upsertEvents, finished } = createFakeRepository();
    const source = createSource(() => Promise.resolve([event]));

    const result = await ingestSource(source, { repository, logger }, new AbortController().signal);

    expect(result).toEqual({ status: "succeeded", eventsUpserted: 1 });
    expect(upsertEvents).toHaveBeenCalledWith([event], { windowed: false });
    expect(finished).toEqual([{ status: "succeeded", eventsUpserted: 1 }]);
  });

  it("tells the repository when the source only covers a recent window", async () => {
    const { repository, upsertEvents } = createFakeRepository();
    const source = { ...createSource(() => Promise.resolve([event])), windowed: true };

    await ingestSource(source, { repository, logger }, new AbortController().signal);

    expect(upsertEvents).toHaveBeenCalledWith([event], { windowed: true });
  });

  it("records a failed run instead of throwing when the feed errors", async () => {
    const { repository, upsertEvents, finished } = createFakeRepository();
    const source = createSource(() => Promise.reject(new Error("upstream returned 503")));

    const result = await ingestSource(source, { repository, logger }, new AbortController().signal);

    expect(result).toEqual({
      status: "failed",
      eventsUpserted: 0,
      error: "upstream returned 503",
    });
    expect(upsertEvents).not.toHaveBeenCalled();
    expect(finished).toHaveLength(1);
  });

  it("records a failed run when persisting events fails", async () => {
    const { repository, upsertEvents, finished } = createFakeRepository();
    upsertEvents.mockRejectedValueOnce(new Error("connection reset"));
    const source = createSource(() => Promise.resolve([event]));

    const result = await ingestSource(source, { repository, logger }, new AbortController().signal);

    expect(result.status).toBe("failed");
    expect(finished[0]?.error).toBe("connection reset");
  });
});
