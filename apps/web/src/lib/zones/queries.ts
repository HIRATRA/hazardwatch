import "server-only";

import { and, asc, count, eq, sql, watchZones, type WatchZone } from "@hazardwatch/db";
import { cache } from "react";

import { db } from "@/lib/db";

import { isZoneId } from "./input";
import type { Zone } from "./types";

const zoneColumns = {
  id: watchZones.id,
  name: watchZones.name,
  center: watchZones.center,
  radiusKm: watchZones.radiusKm,
};

function toZone({ center, ...zone }: Pick<WatchZone, keyof typeof zoneColumns>): Zone {
  return { ...zone, longitude: center.x, latitude: center.y };
}

/** The user's zones in alphabetical order. */
export async function listZones(userId: string): Promise<Zone[]> {
  const rows = await db
    .select(zoneColumns)
    .from(watchZones)
    .where(eq(watchZones.userId, userId))
    .orderBy(sql`lower(${watchZones.name})`, asc(watchZones.createdAt));
  return rows.map(toZone);
}

/**
 * One of the user's zones, or null when it does not exist or belongs to
 * someone else. Deduplicated across a single request.
 */
export const getZone = cache(async (userId: string, id: string): Promise<Zone | null> => {
  // PostgreSQL rejects malformed identifiers instead of matching nothing.
  if (!isZoneId(id)) {
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
