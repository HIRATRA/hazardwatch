import { sql, type SQL } from "drizzle-orm";

import { hazardEvents } from "./schema/hazards.js";
import { watchZones } from "./schema/zones.js";

/**
 * Matches the events located within a watch zone, for queries that involve
 * both tables. Distances are measured on the geography type, which the
 * hazard_events_location_geography_idx index serves (see ADR 0007).
 */
export function eventInZone(): SQL {
  return sql`ST_DWithin(${hazardEvents.location}::geography, ${watchZones.center}::geography, ${watchZones.radiusKm} * 1000)`;
}
