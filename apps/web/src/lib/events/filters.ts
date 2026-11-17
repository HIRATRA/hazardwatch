import {
  hazardKinds,
  hazardSeverities,
  type HazardKind,
  type HazardSeverity,
} from "@hazardwatch/db/constants";
import { z } from "zod";

export const timeWindows = ["24h", "7d", "30d"] as const;
export type TimeWindow = (typeof timeWindows)[number];

const HOUR_MS = 60 * 60 * 1000;

const durationMs: Record<TimeWindow, number> = {
  "24h": 24 * HOUR_MS,
  "7d": 7 * 24 * HOUR_MS,
  "30d": 30 * 24 * HOUR_MS,
};

export interface EventFilters {
  /** Type of hazard to show, or every type when null. */
  kind: HazardKind | null;
  /** How far back to look for events. */
  window: TimeWindow;
  /** Lowest severity to include. */
  severity: HazardSeverity;
}

export const defaultEventFilters: EventFilters = { kind: null, window: "7d", severity: "minor" };

const eventFiltersSchema = z.object({
  kind: z.enum(hazardKinds).nullable().catch(defaultEventFilters.kind),
  window: z.enum(timeWindows).catch(defaultEventFilters.window),
  severity: z.enum(hazardSeverities).catch(defaultEventFilters.severity),
});

type SearchParams = Record<string, string | string[] | undefined>;

/**
 * Reads the map filters from URL search params. Missing or invalid values
 * fall back to the defaults, so a hand-edited URL never breaks the page.
 */
export function parseEventFilters(searchParams: SearchParams): EventFilters {
  return eventFiltersSchema.parse({
    kind: firstValue(searchParams.kind),
    window: firstValue(searchParams.window),
    severity: firstValue(searchParams.severity),
  });
}

/** Serialises filters for the URL, leaving out defaults to keep links short. */
export function toSearchParams(filters: EventFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.kind) {
    params.set("kind", filters.kind);
  }
  if (filters.window !== defaultEventFilters.window) {
    params.set("window", filters.window);
  }
  if (filters.severity !== defaultEventFilters.severity) {
    params.set("severity", filters.severity);
  }
  return params;
}

/** The given severity and every level above it. */
export function severitiesAtLeast(minimum: HazardSeverity): HazardSeverity[] {
  return hazardSeverities.slice(hazardSeverities.indexOf(minimum));
}

/** Start of the time window, relative to `now`. */
export function windowStart(window: TimeWindow, now: Date): Date {
  return new Date(now.getTime() - durationMs[window]);
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
