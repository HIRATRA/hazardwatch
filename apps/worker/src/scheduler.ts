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
  await Promise.all(sources.map((source) => pollSource(source, deps, signal)));
}

async function pollSource(source: Source, deps: IngestDeps, signal: AbortSignal) {
  while (!signal.aborted) {
    try {
      await ingestSource(source, deps, signal);
    } catch (error) {
      // Only reachable when the run record itself cannot be written.
      deps.logger.error({ source: source.id, err: error }, "ingestion bookkeeping failed");
    }

    try {
      await sleep(source.intervalMs, undefined, { signal });
    } catch {
      return; // aborted while waiting
    }
  }
}
