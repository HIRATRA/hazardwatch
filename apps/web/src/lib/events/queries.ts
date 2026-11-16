import "server-only";

import { and, desc, gte, hazardEvents, inArray } from "@hazardwatch/db";

import { db } from "@/lib/db";

import { severitiesAtLeast, windowStart, type EventFilters } from "./filters";
import type { MapEvent } from "./types";

/** Upper bound on events sent to the browser, to keep the page light. */
const MAX_EVENTS = 2_000;

export interface EventsResult {
  /** Most recent events first. */
  events: MapEvent[];
  /** Whether older matching events were left out because of the limit. */
  truncated: boolean;
  /**
   * ISO 8601 time of the query. Relative times are computed against it so
   * that server and client renders agree.
   */
  generatedAt: string;
}

export async function listEvents(filters: EventFilters, now = new Date()): Promise<EventsResult> {
  const rows = await db
    .select({
      id: hazardEvents.id,
      source: hazardEvents.source,
      kind: hazardEvents.kind,
      severity: hazardEvents.severity,
      title: hazardEvents.title,
      url: hazardEvents.url,
      occurredAt: hazardEvents.occurredAt,
      location: hazardEvents.location,
    })
    .from(hazardEvents)
    .where(
      and(
        gte(hazardEvents.occurredAt, windowStart(filters.window, now)),
        inArray(hazardEvents.severity, severitiesAtLeast(filters.severity)),
      ),
    )
    .orderBy(desc(hazardEvents.occurredAt))
    .limit(MAX_EVENTS + 1);

  return {
    events: rows.slice(0, MAX_EVENTS).map(({ location, occurredAt, ...event }) => ({
      ...event,
      occurredAt: occurredAt.toISOString(),
      longitude: location.x,
      latitude: location.y,
    })),
    truncated: rows.length > MAX_EVENTS,
    generatedAt: now.toISOString(),
  };
}
