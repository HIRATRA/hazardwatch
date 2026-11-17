"use server";

import { and, eq, isNull, sql, watchZones, zoneAlerts } from "@hazardwatch/db";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { isUuid } from "@/lib/uuid";

/** Marks an alert as read and shows its event within the zone it reached. */
export async function openAlert(alertId: string): Promise<void> {
  const { user } = await requireSession();
  const [alert] = isUuid(alertId)
    ? await db
        .update(zoneAlerts)
        // Keep the time of the first reading.
        .set({ readAt: sql`coalesce(${zoneAlerts.readAt}, now())` })
        .from(watchZones)
        .where(
          and(
            eq(zoneAlerts.id, alertId),
            eq(watchZones.id, zoneAlerts.zoneId),
            eq(watchZones.userId, user.id),
          ),
        )
        .returning({ zoneId: zoneAlerts.zoneId, eventId: zoneAlerts.eventId })
    : [];

  // The alert may have been deleted with its zone in the meantime.
  redirect(alert ? `/zones/${alert.zoneId}?event=${alert.eventId}` : "/alerts");
}

export async function markAllAlertsRead(): Promise<void> {
  const { user } = await requireSession();
  await db
    .update(zoneAlerts)
    .set({ readAt: sql`now()` })
    .from(watchZones)
    .where(
      and(
        eq(watchZones.id, zoneAlerts.zoneId),
        eq(watchZones.userId, user.id),
        isNull(zoneAlerts.readAt),
      ),
    );
  // The unread count in the header changes too.
  refresh();
}
