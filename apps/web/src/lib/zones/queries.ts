import "server-only";

import {
  and,
  asc,
  count,
  eq,
  eventInZone,
  gte,
  hazardEvents,
  sql,
  watchZones,
  type HazardSeverity,
  type WatchZone,
} from "@hazardwatch/db";
import { cache } from "react";

import { db } from "@/lib/db";
import { windowStart, type TimeWindow } from "@/lib/events/filters";
import { isUuid } from "@/lib/uuid";

import type { Zone, ZoneSummary } from "./types";

/** Period over which the zone list counts events. */
export const RECENT_WINDOW: TimeWindow = "7d";

const zoneColumns = {
  id: watchZones.id,
  name: watchZones.name,
  center: watchZones.center,
  radiusKm: watchZones.radiusKm,
  alertMinSeverity: watchZones.alertMinSeverity,
};

function toZone({ center, ...zone }: Pick<WatchZone, keyof typeof zoneColumns>): Zone {
  return { ...zone, longitude: center.x, latitude: center.y };
}

/**
 * The user's zones in alphabetical order, each with the events active within
 * it during the recent window.
 */
export async function listZones(userId: string, now = new Date()): Promise<ZoneSummary[]> {
  const rows = await db
    .select({
      ...zoneColumns,
      recentEvents: count(hazardEvents.id),
      // PostgreSQL orders enum values as declared, from minor to extreme.
      highestSeverity: sql<HazardSeverity | null>`max(${hazardEvents.severity})`,
    })
    .from(watchZones)
    .leftJoin(
      hazardEvents,
      and(eventInZone(), gte(hazardEvents.activeUntil, windowStart(RECENT_WINDOW, now))),
    )
    .where(eq(watchZones.userId, userId))
    .groupBy(watchZones.id)
    .orderBy(sql`lower(${watchZones.name})`, asc(watchZones.createdAt));

  return rows.map(({ recentEvents, highestSeverity, ...zone }) => ({
    ...toZone(zone),
    recentEvents,
    highestSeverity,
  }));
}

/**
 * One of the user's zones, or null when it does not exist or belongs to
 * someone else. Deduplicated across a single request.
 */
export const getZone = cache(async (userId: string, id: string): Promise<Zone | null> => {
  // PostgreSQL rejects malformed identifiers instead of matching nothing.
  if (!isUuid(id)) {
    return null;
  }
  const [row] = await db
    .select(zoneColumns)
    .from(watchZones)
    .where(and(eq(watchZones.id, id), eq(watchZones.userId, userId)));
  return row ? toZone(row) : null;
});

export async function countZones(userId: string): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(watchZones)
    .where(eq(watchZones.userId, userId));
  return row?.total ?? 0;
}
