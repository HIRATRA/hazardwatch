import "server-only";

import { and, desc, eq, gte, hazardEvents, inArray, watchZones } from "@hazardwatch/db";

import { db } from "@/lib/db";
import { eventInZone } from "@/lib/zones/queries";

import { severitiesAtLeast, windowStart, type EventFilters } from "./filters";
import type { MapEvent } from "./types";

/** Upper bound on events sent to the browser, to keep the page light. */
const MAX_EVENTS = 2_000;

export interface EventsResult {
  /** Most recently active events first. */
  events: MapEvent[];
  /** Whether events active longer ago were left out because of the limit. */
  truncated: boolean;
  /**
   * ISO 8601 time of the query. Relative times are computed against it so
   * that server and client renders agree.
   */
  generatedAt: string;
}

interface ListEventsOptions {
  /** Only keep the events located within this watch zone. */
  zoneId?: string;
  now?: Date;
}

/**
 * Lists the events active at some point during the time window, so that a
 * flood that started a month ago and is still going on is included.
 */
export async function listEvents(
  filters: EventFilters,
  { zoneId, now = new Date() }: ListEventsOptions = {},
): Promise<EventsResult> {
  const query = db
    .select({
      id: hazardEvents.id,
      source: hazardEvents.source,
      kind: hazardEvents.kind,
      severity: hazardEvents.severity,
      title: hazardEvents.title,
      url: hazardEvents.url,
      occurredAt: hazardEvents.occurredAt,
      activeUntil: hazardEvents.activeUntil,
      location: hazardEvents.location,
    })
    .from(hazardEvents)
    .$dynamic();

  const rows = await (
    zoneId ? query.innerJoin(watchZones, and(eq(watchZones.id, zoneId), eventInZone())) : query
  )
    .where(
      and(
        filters.kind ? eq(hazardEvents.kind, filters.kind) : undefined,
        gte(hazardEvents.activeUntil, windowStart(filters.window, now)),
        inArray(hazardEvents.severity, severitiesAtLeast(filters.severity)),
      ),
    )
    .orderBy(desc(hazardEvents.activeUntil))
    .limit(MAX_EVENTS + 1);

  return {
    events: rows.slice(0, MAX_EVENTS).map(({ location, occurredAt, activeUntil, ...event }) => ({
      ...event,
      occurredAt: occurredAt.toISOString(),
      activeUntil: activeUntil.toISOString(),
      longitude: location.x,
      latitude: location.y,
    })),
    truncated: rows.length > MAX_EVENTS,
    generatedAt: now.toISOString(),
  };
}
