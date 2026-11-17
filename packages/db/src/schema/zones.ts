import { sql } from "drizzle-orm";
import {
  check,
  geometry,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { maxZoneRadiusKm, minZoneRadiusKm } from "../constants.js";
import { user } from "./auth.js";

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

export type WatchZone = typeof watchZones.$inferSelect;
export type NewWatchZone = typeof watchZones.$inferInsert;
