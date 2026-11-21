import "server-only";

import { desc, ingestionRuns, ne, type HazardSource, type IngestionStatus } from "@hazardwatch/db";

import { db } from "@/lib/db";

/** The last finished run of a source. */
export interface SourceRun {
  source: HazardSource;
  status: Exclude<IngestionStatus, "running">;
  /** ISO 8601 time at which the run started. */
  startedAt: string;
}

/**
 * The last finished run of each source that ran at least once. A source
 * without runs is turned off, for example for lack of an API key.
 */
export async function listLastRuns(): Promise<SourceRun[]> {
  const rows = await db
    .selectDistinctOn([ingestionRuns.source], {
      source: ingestionRuns.source,
      status: ingestionRuns.status,
      startedAt: ingestionRuns.startedAt,
    })
    .from(ingestionRuns)
    .where(ne(ingestionRuns.status, "running"))
    .orderBy(ingestionRuns.source, desc(ingestionRuns.startedAt));

  return rows.map(({ status, startedAt, ...run }) => ({
    ...run,
    status: status === "failed" ? "failed" : "succeeded",
    startedAt: startedAt.toISOString(),
  }));
}
