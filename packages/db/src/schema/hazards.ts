import {
  geometry,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { hazardKinds, hazardSeverities, hazardSources, ingestionStatuses } from "../constants.js";

export const hazardSource = pgEnum("hazard_source", hazardSources);
export const hazardKind = pgEnum("hazard_kind", hazardKinds);
export const hazardSeverity = pgEnum("hazard_severity", hazardSeverities);
export const ingestionStatus = pgEnum("ingestion_status", ingestionStatuses);

/**
 * A single hazard observation normalised from an upstream feed.
 * Rows are upserted on (source, external_id), so re-ingesting a feed is idempotent.
 */
export const hazardEvents = pgTable(
  "hazard_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    source: hazardSource("source").notNull(),
    externalId: text("external_id").notNull(),
    kind: hazardKind("kind").notNull(),
    severity: hazardSeverity("severity").notNull(),
    title: text("title").notNull(),
    url: text("url"),
    location: geometry("location", { type: "point", mode: "xy", srid: 4326 }).notNull(),
    properties: jsonb("properties").$type<Record<string, unknown>>().notNull().default({}),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    sourceUpdatedAt: timestamp("source_updated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("hazard_events_source_external_id_idx").on(t.source, t.externalId),
    index("hazard_events_location_idx").using("gist", t.location),
    index("hazard_events_occurred_at_idx").on(t.occurredAt.desc()),
    index("hazard_events_kind_idx").on(t.kind),
  ],
);

/** One row per worker run against a source, for observability and backoff decisions. */
export const ingestionRuns = pgTable(
  "ingestion_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    source: hazardSource("source").notNull(),
    status: ingestionStatus("status").notNull().default("running"),
    eventsUpserted: integer("events_upserted").notNull().default(0),
    error: text("error"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (t) => [index("ingestion_runs_source_started_at_idx").on(t.source, t.startedAt.desc())],
);

export type HazardEvent = typeof hazardEvents.$inferSelect;
export type NewHazardEvent = typeof hazardEvents.$inferInsert;
export type IngestionRun = typeof ingestionRuns.$inferSelect;
