import "server-only";

import {
  and,
  count,
  desc,
  eq,
  hazardEvents,
  isNull,
  watchZones,
  zoneAlerts,
  type HazardSeverity,
} from "@hazardwatch/db";
import { cache } from "react";

import { db } from "@/lib/db";

/** Upper bound on alerts listed at once. Older ones stay in the database. */
const MAX_ALERTS = 100;

/** An alert as shown in the list, with what the user needs to recognise it. */
export interface AlertItem {
  id: string;
  /** Severity of the event when the alert was last raised. */
  severity: HazardSeverity;
  /** ISO 8601 time at which the alert was last raised. */
  raisedAt: string;
  read: boolean;
  eventTitle: string;
  zoneName: string;
}

export interface AlertsResult {
  /** Most recently raised first. */
  alerts: AlertItem[];
  /** Whether older alerts were left out because of the limit. */
  truncated: boolean;
  /** ISO 8601 time of the query, the reference for relative times. */
  generatedAt: string;
}

/** The alerts raised for the user's zones, most recent first. */
export async function listAlerts(userId: string, now = new Date()): Promise<AlertsResult> {
  const rows = await db
    .select({
      id: zoneAlerts.id,
      severity: zoneAlerts.severity,
      raisedAt: zoneAlerts.raisedAt,
      readAt: zoneAlerts.readAt,
      eventTitle: hazardEvents.title,
      zoneName: watchZones.name,
    })
    .from(zoneAlerts)
    .innerJoin(watchZones, eq(watchZones.id, zoneAlerts.zoneId))
    .innerJoin(hazardEvents, eq(hazardEvents.id, zoneAlerts.eventId))
    .where(eq(watchZones.userId, userId))
    .orderBy(desc(zoneAlerts.raisedAt), desc(zoneAlerts.id))
    .limit(MAX_ALERTS + 1);

  return {
    alerts: rows.slice(0, MAX_ALERTS).map(({ raisedAt, readAt, ...alert }) => ({
      ...alert,
      raisedAt: raisedAt.toISOString(),
      read: readAt !== null,
    })),
    truncated: rows.length > MAX_ALERTS,
    generatedAt: now.toISOString(),
  };
}

/** Number of alerts the user has not read yet. Deduplicated across a single request. */
export const countUnreadAlerts = cache(async (userId: string): Promise<number> => {
  const [row] = await db
    .select({ total: count() })
    .from(zoneAlerts)
    .innerJoin(watchZones, eq(watchZones.id, zoneAlerts.zoneId))
    .where(and(eq(watchZones.userId, userId), isNull(zoneAlerts.readAt)));
  return row?.total ?? 0;
});
