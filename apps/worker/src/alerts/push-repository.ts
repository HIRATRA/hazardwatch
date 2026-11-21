import {
  and,
  asc,
  desc,
  eq,
  gte,
  hazardEvents,
  inArray,
  isNull,
  pushSubscriptions,
  sql,
  watchZones,
  zoneAlerts,
  type Database,
  type HazardSeverity,
} from "@hazardwatch/db";

/** Alerts claimed in one pass, at most. The others wait for the next pass. */
const CLAIM_LIMIT = 500;

/**
 * Alerts that could not be pushed within an hour stay in the app and in
 * email: a notification about an older event would come too late to help.
 */
const PUSH_WINDOW = sql`interval '1 hour'`;

/** An alert to push, with what the notification needs. */
export interface AlertPush {
  alertId: string;
  userId: string;
  zoneId: string;
  zoneName: string;
  eventId: string;
  eventTitle: string;
  severity: HazardSeverity;
}

/** A browser to push to, as the Push API describes it. */
export interface PushTarget {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface AlertPushRepository {
  /**
   * Marks the alerts waiting to be pushed as sent and resolves to them, most
   * recent first. Only alerts whose owner has at least one browser to push
   * to are claimed. Concurrent workers never claim the same alert.
   */
  claimPending(): Promise<AlertPush[]>;
  /** Puts alerts back in the queue after no notification could be sent. */
  release(alertIds: readonly string[]): Promise<void>;
  /** The browsers of the given users. */
  listTargets(userIds: readonly string[]): Promise<PushTarget[]>;
  /** Forgets browsers whose push service says they are gone. */
  removeTargets(targetIds: readonly string[]): Promise<void>;
}

export function createAlertPushRepository(db: Database): AlertPushRepository {
  return {
    async claimPending() {
      const subscribed = db
        .select({ one: sql`1` })
        .from(pushSubscriptions)
        .where(eq(pushSubscriptions.userId, watchZones.userId));

      const pending = db
        .select({ id: zoneAlerts.id })
        .from(zoneAlerts)
        .innerJoin(watchZones, eq(watchZones.id, zoneAlerts.zoneId))
        .where(
          and(
            isNull(zoneAlerts.pushedAt),
            // An alert read in the app already needs no notification.
            isNull(zoneAlerts.readAt),
            gte(zoneAlerts.raisedAt, sql`now() - ${PUSH_WINDOW}`),
            sql`exists (${subscribed})`,
          ),
        )
        .orderBy(asc(zoneAlerts.raisedAt))
        .limit(CLAIM_LIMIT)
        // Another worker claiming at the same time skips these rows.
        .for("update", { of: zoneAlerts, skipLocked: true });

      const claimed = await db
        .update(zoneAlerts)
        .set({ pushedAt: sql`now()` })
        .where(inArray(zoneAlerts.id, pending))
        .returning({ id: zoneAlerts.id });
      if (claimed.length === 0) {
        return [];
      }

      return db
        .select({
          alertId: zoneAlerts.id,
          userId: watchZones.userId,
          zoneId: watchZones.id,
          zoneName: watchZones.name,
          eventId: hazardEvents.id,
          eventTitle: hazardEvents.title,
          severity: zoneAlerts.severity,
        })
        .from(zoneAlerts)
        .innerJoin(watchZones, eq(watchZones.id, zoneAlerts.zoneId))
        .innerJoin(hazardEvents, eq(hazardEvents.id, zoneAlerts.eventId))
        .where(
          inArray(
            zoneAlerts.id,
            claimed.map((row) => row.id),
          ),
        )
        .orderBy(desc(zoneAlerts.raisedAt));
    },

    async release(alertIds) {
      if (alertIds.length === 0) {
        return;
      }
      await db
        .update(zoneAlerts)
        .set({ pushedAt: null })
        .where(inArray(zoneAlerts.id, [...alertIds]));
    },

    async listTargets(userIds) {
      if (userIds.length === 0) {
        return [];
      }
      return db
        .select({
          id: pushSubscriptions.id,
          userId: pushSubscriptions.userId,
          endpoint: pushSubscriptions.endpoint,
          p256dh: pushSubscriptions.p256dh,
          auth: pushSubscriptions.auth,
        })
        .from(pushSubscriptions)
        .where(inArray(pushSubscriptions.userId, [...userIds]));
    },

    async removeTargets(targetIds) {
      if (targetIds.length === 0) {
        return;
      }
      await db.delete(pushSubscriptions).where(inArray(pushSubscriptions.id, [...targetIds]));
    },
  };
}
