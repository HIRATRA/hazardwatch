import type { Logger } from "./logger.js";
import type { IngestionRepository, RunResult } from "./repository.js";
import type { Source } from "./sources/index.js";

export interface IngestDeps {
  repository: IngestionRepository;
  logger: Logger;
}

/**
 * Runs a single ingestion pass for a source and records its outcome.
 * Failures are captured on the run record instead of being thrown, so one
 * broken feed never stops the scheduler.
 */
export async function ingestSource(
  source: Source,
  { repository, logger }: IngestDeps,
  signal: AbortSignal,
): Promise<RunResult> {
  const log = logger.child({ source: source.id });
  const startedAt = performance.now();
  const runId = await repository.startRun(source.id);

  let result: RunResult;
  try {
    const events = await source.fetchEvents({ signal, logger: log });
    const { eventsUpserted, alertsRaised } = await repository.upsertEvents(events);
    result = { status: "succeeded", eventsUpserted };
    log.info(
      {
        runId,
        fetched: events.length,
        eventsUpserted,
        alertsRaised,
        durationMs: elapsed(startedAt),
      },
      "ingestion succeeded",
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    result = { status: "failed", eventsUpserted: 0, error: message };
    log.error({ runId, err: error, durationMs: elapsed(startedAt) }, "ingestion failed");
  }

  await repository.finishRun(runId, result);
  return result;
}

function elapsed(startedAt: number) {
  return Math.round(performance.now() - startedAt);
}
