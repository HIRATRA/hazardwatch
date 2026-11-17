import {
  and,
  asc,
  desc,
  eq,
  gte,
  hazardEvents,
  inArray,
  isNull,
  sql,
  user,
  watchZones,
  zoneAlerts,
  type Database,
  type HazardSeverity,
} from "@hazardwatch/db";

/** Alerts claimed in one pass, at most. The others wait for the next pass. */
const CLAIM_LIMIT = 500;

/** Alerts that could not be emailed within a day stay in the app only. */
const EMAIL_WINDOW = sql`interval '1 day'`;

/** An alert to email, with what the message needs. */
export interface AlertEmail {
  alertId: string;
  userId: string;
  userName: string;
  userEmail: string;
  zoneId: string;
  zoneName: string;
  eventId: string;
  eventTitle: string;
  severity: HazardSeverity;
}

export interface AlertEmailRepository {
  /**
   * Marks the alerts waiting to be emailed as sent and resolves to them,
   * most recent first. Concurrent workers never claim the same alert.
   */
  claimPending(): Promise<AlertEmail[]>;
  /** Puts alerts back in the queue after their email could not be sent. */
  release(alertIds: readonly string[]): Promise<void>;
}

export function createAlertEmailRepository(db: Database): AlertEmailRepository {
  return {
    async claimPending() {
      const pending = db
        .select({ id: zoneAlerts.id })
        .from(zoneAlerts)
        .innerJoin(watchZones, eq(watchZones.id, zoneAlerts.zoneId))
        .innerJoin(user, eq(user.id, watchZones.userId))
        .where(
          and(
            isNull(zoneAlerts.emailedAt),
            // An alert read in the app already needs no email.
            isNull(zoneAlerts.readAt),
            gte(zoneAlerts.raisedAt, sql`now() - ${EMAIL_WINDOW}`),
            eq(watchZones.emailAlerts, true),
            // Never email an address its owner has not confirmed.
            eq(user.emailVerified, true),
          ),
        )
        .orderBy(asc(zoneAlerts.raisedAt))
        .limit(CLAIM_LIMIT)
        // Another worker claiming at the same time skips these rows.
        .for("update", { of: zoneAlerts, skipLocked: true });

      const claimed = await db
        .update(zoneAlerts)
        .set({ emailedAt: sql`now()` })
        .where(inArray(zoneAlerts.id, pending))
        .returning({ id: zoneAlerts.id });
      if (claimed.length === 0) {
        return [];
      }

      return db
        .select({
          alertId: zoneAlerts.id,
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          zoneId: watchZones.id,
          zoneName: watchZones.name,
          eventId: hazardEvents.id,
          eventTitle: hazardEvents.title,
          severity: zoneAlerts.severity,
        })
        .from(zoneAlerts)
        .innerJoin(watchZones, eq(watchZones.id, zoneAlerts.zoneId))
        .innerJoin(user, eq(user.id, watchZones.userId))
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
        .set({ emailedAt: null })
        .where(inArray(zoneAlerts.id, [...alertIds]));
    },
  };
}
