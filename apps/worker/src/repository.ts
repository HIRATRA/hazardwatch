import {
  and,
  eq,
  eventInZone,
  gte,
  hazardEvents,
  inArray,
  ingestionRuns,
  sql,
  watchZones,
  zoneAlerts,
  type Database,
  type HazardSource,
} from "@hazardwatch/db";

import type { IngestedEvent } from "./sources/index.js";

const UPSERT_BATCH_SIZE = 500;

/**
 * How long after it ends an event can still raise alerts. Sources keep
 * revising old events, and an alert about a cyclone that faded weeks ago
 * would only be noise.
 */
const ALERT_GRACE_PERIOD = sql`interval '1 day'`;

/**
 * Longest silence within one event of a windowed source. Activity seen after
 * a longer gap starts the event again, which raises its alerts again. Clouds
 * can hide a fire from satellites for a day or so.
 */
const EPISODE_GAP = sql`interval '2 days'`;

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

export interface RunResult {
  status: "succeeded" | "failed";
  eventsUpserted: number;
  error?: string;
}

export interface UpsertResult {
  /** Events inserted or updated. */
  eventsUpserted: number;
  /** Alerts raised, or raised again, for the watch zones those events reach. */
  alertsRaised: number;
}

/** Persistence operations the ingestion pipeline depends on. */
export interface IngestionRepository {
  startRun(source: HazardSource): Promise<string>;
  finishRun(runId: string, result: RunResult): Promise<void>;
  /**
   * Inserts new events and updates revised ones, then raises alerts for the
   * watch zones they reach, in the same transaction so that no alert is lost.
   */
  upsertEvents(events: readonly IngestedEvent[], options?: UpsertOptions): Promise<UpsertResult>;
}

export interface UpsertOptions {
  /** The events come from a windowed source, see `Source.windowed`. */
  windowed?: boolean;
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

    async upsertEvents(events, { windowed = false } = {}) {
      const total: UpsertResult = { eventsUpserted: 0, alertsRaised: 0 };
      for (let start = 0; start < events.length; start += UPSERT_BATCH_SIZE) {
        const batch = events.slice(start, start + UPSERT_BATCH_SIZE);
        const result = await db.transaction(async (tx) => {
          const eventIds = await writeEvents(tx, batch, windowed);
          return { eventsUpserted: eventIds.length, alertsRaised: await raiseAlerts(tx, eventIds) };
        });
        total.eventsUpserted += result.eventsUpserted;
        total.alertsRaised += result.alertsRaised;
      }
      return total;
    },
  };
}

/** Upserts a batch of events and resolves to the ids of the rows written. */
async function writeEvents(
  tx: Transaction,
  events: readonly IngestedEvent[],
  windowed: boolean,
): Promise<string[]> {
  const rows = await tx
    .insert(hazardEvents)
    .values([...events])
    .onConflictDoUpdate({
      target: [hazardEvents.source, hazardEvents.externalId],
      set: {
        kind: sql`excluded.kind`,
        severity: sql`excluded.severity`,
        title: sql`excluded.title`,
        url: sql`excluded.url`,
        location: sql`excluded.location`,
        properties: sql`excluded.properties`,
        occurredAt: windowed
          ? // The window only shows the recent part of an ongoing event: keep
            // its start, unless it went quiet long enough to count as new.
            sql`case
                when ${hazardEvents.activeUntil} >= excluded.occurred_at - ${EPISODE_GAP}
                  then least(${hazardEvents.occurredAt}, excluded.occurred_at)
                else excluded.occurred_at
              end`
          : sql`excluded.occurred_at`,
        activeUntil: sql`excluded.active_until`,
        sourceUpdatedAt: sql`excluded.source_updated_at`,
        updatedAt: sql`now()`,
      },
      // Feeds are polled far more often than events change. When the source
      // reports a revision time, rewrite the row only if it moved on.
      setWhere: sql`excluded.source_updated_at is null
        or excluded.source_updated_at is distinct from ${hazardEvents.sourceUpdatedAt}`,
    })
    .returning({ id: hazardEvents.id });
  return rows.map((row) => row.id);
}

/**
 * Raises an alert for every watch zone that one of the given events reaches
 * at or above the zone's threshold, as long as the event is still going on
 * or ended recently. An alert is raised once per zone and event, and again,
 * unread, if the event becomes more severe or starts again. Resolves to the
 * number of alerts raised.
 */
async function raiseAlerts(tx: Transaction, eventIds: readonly string[]): Promise<number> {
  if (eventIds.length === 0) {
    return 0;
  }

  // Drizzle inserts from a select only when it lists every column of the
  // table, in order, so the defaults are spelled out.
  const reached = tx
    .select({
      id: sql<string>`gen_random_uuid()`.as("id"),
      zoneId: watchZones.id,
      eventId: hazardEvents.id,
      severity: hazardEvents.severity,
      raisedAt: sql<Date>`now()`.as("raised_at"),
      readAt: sql<Date | null>`null`.as("read_at"),
      emailedAt: sql<Date | null>`null`.as("emailed_at"),
      pushedAt: sql<Date | null>`null`.as("pushed_at"),
    })
    .from(hazardEvents)
    .innerJoin(watchZones, eventInZone())
    .where(
      and(
        inArray(hazardEvents.id, [...eventIds]),
        // PostgreSQL orders enum values as declared, and a zone without a
        // threshold compares as null, which never matches.
        gte(hazardEvents.severity, watchZones.alertMinSeverity),
        gte(hazardEvents.activeUntil, sql`now() - ${ALERT_GRACE_PERIOD}`),
      ),
    );

  const raised = await tx
    .insert(zoneAlerts)
    .select(reached)
    .onConflictDoUpdate({
      target: [zoneAlerts.zoneId, zoneAlerts.eventId],
      // Raised again: unread, emailed again if the zone asks for it and
      // pushed again.
      set: {
        severity: sql`excluded.severity`,
        raisedAt: sql`now()`,
        readAt: null,
        emailedAt: null,
        pushedAt: null,
      },
      // Only when the event grew more severe, or started again after the
      // alert, as a windowed source reports for a fire that flares up anew.
      setWhere: sql`excluded.severity > ${zoneAlerts.severity}
        or ${zoneAlerts.raisedAt} < (
          select ${hazardEvents.occurredAt} from ${hazardEvents}
          where ${hazardEvents.id} = excluded.event_id
        )`,
    })
    .returning({ id: zoneAlerts.id });
  return raised.length;
}
