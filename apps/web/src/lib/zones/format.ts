import { formatCoordinates } from "@/lib/events/format";

import type { ZoneShape } from "./types";

// Plain number formatting followed by the unit: Intl unit styles may separate
// them with different spaces on the server and in the browser.
const numberFormat = new Intl.NumberFormat("en");

/** Formats a radius as "1,000 km". */
export function formatRadius(radiusKm: number): string {
  return `${numberFormat.format(radiusKm)} km`;
}

/** Describes a zone as "Within 100 km of 38.72° N, 9.14° W". */
export function describeZoneArea({ longitude, latitude, radiusKm }: ZoneShape): string {
  return `Within ${formatRadius(radiusKm)} of ${formatCoordinates(latitude, longitude)}`;
}
