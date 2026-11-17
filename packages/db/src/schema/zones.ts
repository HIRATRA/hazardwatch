import { sql } from "drizzle-orm";
import {
  check,
  geometry,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { defaultAlertMinSeverity, maxZoneRadiusKm, minZoneRadiusKm } from "../constants.js";
import { user } from "./auth.js";
import { hazardEvents, hazardSeverity } from "./hazards.js";

/**
 * An area a user watches for hazards: the circle of `radius_km` around
 * `center`, measured on the surface of the Earth. An event belongs to the
 * zone when its location lies within that circle.
 */
export const watchZones = pgTable(
  "watch_zones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    center: geometry("center", { type: "point", mode: "xy", srid: 4326 }).notNull(),
    radiusKm: integer("radius_km").notNull(),
    /**
     * Lowest severity that raises an alert when an event reaches the zone,
     * or null when the user does not want alerts for it.
     */
    alertMinSeverity: hazardSeverity("alert_min_severity").default(defaultAlertMinSeverity),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("watch_zones_user_id_idx").on(t.userId),
    check(
      "watch_zones_radius_km_check",
      sql`${t.radiusKm} between ${sql.raw(String(minZoneRadiusKm))} and ${sql.raw(String(maxZoneRadiusKm))}`,
    ),
  ],
);

/**
 * An event that reached a watch zone at or above its alert threshold. There
 * is one alert per zone and event: when the event grows more severe, the
 * alert is raised again and becomes unread.
 */
export const zoneAlerts = pgTable(
  "zone_alerts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    zoneId: uuid("zone_id")
      .notNull()
      .references(() => watchZones.id, { onDelete: "cascade" }),
    eventId: uuid("event_id")
      .notNull()
      .references(() => hazardEvents.id, { onDelete: "cascade" }),
    /** Severity of the event when the alert was last raised. */
    severity: hazardSeverity("severity").notNull(),
    raisedAt: timestamp("raised_at", { withTimezone: true }).notNull().defaultNow(),
    /** When the user read the alert, or null while it is unread. */
    readAt: timestamp("read_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("zone_alerts_zone_id_event_id_idx").on(t.zoneId, t.eventId),
    // Serves the cascade when an event is deleted.
    index("zone_alerts_event_id_idx").on(t.eventId),
  ],
);

export type WatchZone = typeof watchZones.$inferSelect;
export type NewWatchZone = typeof watchZones.$inferInsert;
export type ZoneAlert = typeof zoneAlerts.$inferSelect;
