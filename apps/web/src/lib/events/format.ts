import type { HazardKind, HazardSeverity, HazardSource } from "@hazardwatch/db/constants";

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

/** Formats a position as "15.03° S, 76.03° W". */
export function formatCoordinates(latitude: number, longitude: number): string {
  const latitudeLabel = `${Math.abs(latitude).toFixed(2)}° ${latitude < 0 ? "S" : "N"}`;
  const longitudeLabel = `${Math.abs(longitude).toFixed(2)}° ${longitude < 0 ? "W" : "E"}`;
  return `${latitudeLabel}, ${longitudeLabel}`;
}
