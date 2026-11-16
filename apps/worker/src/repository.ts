import {
  eq,
  hazardEvents,
  ingestionRuns,
  sql,
  type Database,
  type HazardSource,
} from "@hazardwatch/db";

import type { IngestedEvent } from "./sources/index.js";

const UPSERT_BATCH_SIZE = 500;

export interface RunResult {
  status: "succeeded" | "failed";
  eventsUpserted: number;
  error?: string;
}

/** Persistence operations the ingestion pipeline depends on. */
export interface IngestionRepository {
  startRun(source: HazardSource): Promise<string>;
  finishRun(runId: string, result: RunResult): Promise<void>;
  upsertEvents(events: readonly IngestedEvent[]): Promise<number>;
}

export function createIngestionRepository(db: Database): IngestionRepository {
  return {
    async startRun(source) {
      const [run] = await db
        .insert(ingestionRuns)
        .values({ source })
        .returning({ id: ingestionRuns.id });
      if (!run) {
        throw new Error("Failed to record ingestion run");
      }
      return run.id;
    },

    async finishRun(runId, result) {
      await db
        .update(ingestionRuns)
        .set({
          status: result.status,
          eventsUpserted: result.eventsUpserted,
          error: result.error ?? null,
          finishedAt: new Date(),
        })
        .where(eq(ingestionRuns.id, runId));
    },

    async upsertEvents(events) {
      let upserted = 0;
      for (let start = 0; start < events.length; start += UPSERT_BATCH_SIZE) {
        const batch = events.slice(start, start + UPSERT_BATCH_SIZE);
        const rows = await db
          .insert(hazardEvents)
          .values(batch)
          .onConflictDoUpdate({
            target: [hazardEvents.source, hazardEvents.externalId],
            set: {
              kind: sql`excluded.kind`,
              severity: sql`excluded.severity`,
              title: sql`excluded.title`,
              url: sql`excluded.url`,
              location: sql`excluded.location`,
              properties: sql`excluded.properties`,
              occurredAt: sql`excluded.occurred_at`,
              sourceUpdatedAt: sql`excluded.source_updated_at`,
              updatedAt: sql`now()`,
            },
          })
          .returning({ id: hazardEvents.id });
        upserted += rows.length;
      }
      return upserted;
    },
  };
}
