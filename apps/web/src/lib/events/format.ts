import {
  hazardKinds,
  type HazardKind,
  type HazardSeverity,
  type HazardSource,
} from "@hazardwatch/db/constants";

import type { TimeWindow } from "./filters";

export const hazardKindLabels: Record<HazardKind, string> = {
  earthquake: "Earthquake",
  wildfire: "Wildfire",
  tropical_cyclone: "Tropical cyclone",
  flood: "Flood",
  volcano: "Volcano",
  drought: "Drought",
};

export const hazardSeverityLabels: Record<HazardSeverity, string> = {
  minor: "Minor",
  moderate: "Moderate",
  severe: "Severe",
  extreme: "Extreme",
};

export const hazardSourceLabels: Record<HazardSource, string> = {
  usgs: "USGS",
  nasa_firms: "NASA FIRMS",
  gdacs: "GDACS",
};

export const timeWindowLabels: Record<TimeWindow, string> = {
  "24h": "Past 24 hours",
  "7d": "Past 7 days",
  "30d": "Past 30 days",
};

/** Formats a position as "15.03° S, 76.03° W". */
export function formatCoordinates(latitude: number, longitude: number): string {
  const latitudeLabel = `${Math.abs(latitude).toFixed(2)}° ${latitude < 0 ? "S" : "N"}`;
  const longitudeLabel = `${Math.abs(longitude).toFixed(2)}° ${longitude < 0 ? "W" : "E"}`;
  return `${latitudeLabel}, ${longitudeLabel}`;
}

/** Nouns for counting events of each kind: "1 flood", "3 floods". */
export const hazardKindNouns: Record<HazardKind, { one: string; other: string }> = {
  earthquake: { one: "earthquake", other: "earthquakes" },
  wildfire: { one: "wildfire", other: "wildfires" },
  tropical_cyclone: { one: "tropical cyclone", other: "tropical cyclones" },
  flood: { one: "flood", other: "floods" },
  volcano: { one: "volcano", other: "volcanoes" },
  drought: { one: "drought", other: "droughts" },
};

const countFormat = new Intl.NumberFormat("en");

/**
 * Lists event counts in the order of hazard kinds: "43 earthquakes, 403
 * wildfires and 2 floods". Returns null when there is nothing to count.
 */
export function formatEventCounts(counts: Partial<Record<HazardKind, number>>): string | null {
  const parts = hazardKinds
    .filter((kind) => (counts[kind] ?? 0) > 0)
    .map((kind) => {
      const count = counts[kind] ?? 0;
      return `${countFormat.format(count)} ${count === 1 ? hazardKindNouns[kind].one : hazardKindNouns[kind].other}`;
    });
  if (parts.length === 0) {
    return null;
  }
  return parts.length === 1 ? parts[0]! : `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)!}`;
}
