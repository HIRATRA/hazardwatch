import { setTimeout as sleep } from "node:timers/promises";

import type { IngestDeps } from "./ingest.js";
import { ingestSource } from "./ingest.js";
import type { Source } from "./sources/index.js";

/**
 * Polls every source on its own interval until the signal is aborted.
 * Runs for a given source never overlap: the next run is scheduled only
 * after the previous one has finished.
 */
export async function runScheduler(
  sources: readonly Source[],
  deps: IngestDeps,
  signal: AbortSignal,
): Promise<void> {
  await Promise.all(
    sources.map((source) =>
      repeatEvery(
        source.intervalMs,
        async () => {
          try {
            await ingestSource(source, deps, signal);
          } catch (error) {
            // Only reachable when the run record itself cannot be written.
            deps.logger.error({ source: source.id, err: error }, "ingestion bookkeeping failed");
          }
        },
        signal,
      ),
    ),
  );
}

/**
 * Runs a task, waits for the interval, and starts again until the signal is
 * aborted. The wait starts once the task has finished, so runs never
 * overlap. The task must handle its own errors.
 */
export async function repeatEvery(
  intervalMs: number,
  task: () => Promise<void>,
  signal: AbortSignal,
): Promise<void> {
  while (!signal.aborted) {
    await task();
    try {
      await sleep(intervalMs, undefined, { signal });
    } catch {
      return; // aborted while waiting
    }
  }
}
