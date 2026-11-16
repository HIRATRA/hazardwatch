/**
 * Domain values shared by the database enums and the applications.
 *
 * This module must not import anything: it is published as the
 * `@hazardwatch/db/constants` entry point so that browser code can use these
 * values without pulling the database driver into the client bundle.
 */

export const hazardSources = ["usgs", "nasa_firms", "gdacs"] as const;

export const hazardKinds = [
  "earthquake",
  "wildfire",
  "tropical_cyclone",
  "flood",
  "volcano",
  "drought",
] as const;

/** Ordered from the least to the most severe. */
export const hazardSeverities = ["minor", "moderate", "severe", "extreme"] as const;

export const ingestionStatuses = ["running", "succeeded", "failed"] as const;

export type HazardSource = (typeof hazardSources)[number];
export type HazardKind = (typeof hazardKinds)[number];
export type HazardSeverity = (typeof hazardSeverities)[number];
export type IngestionStatus = (typeof ingestionStatuses)[number];
