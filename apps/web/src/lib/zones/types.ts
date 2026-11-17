import type { HazardSeverity } from "@hazardwatch/db/constants";

/** The circle a watch zone covers, measured on the surface of the Earth. */
export interface ZoneShape {
  longitude: number;
  latitude: number;
  radiusKm: number;
}

/** A watch zone as sent to the browser. */
export interface Zone extends ZoneShape {
  id: string;
  name: string;
}

/** A watch zone with a digest of the events within it. */
export interface ZoneSummary extends Zone {
  /** Number of events active during the recent window. */
  recentEvents: number;
  /** Highest severity among those events, or null when there are none. */
  highestSeverity: HazardSeverity | null;
}
