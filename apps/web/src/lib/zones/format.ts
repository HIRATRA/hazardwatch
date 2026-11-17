import type { HazardSeverity } from "@hazardwatch/db/constants";

import type { TimeWindow } from "@/lib/events/filters";
import { formatCoordinates, hazardSeverityLabels, timeWindowLabels } from "@/lib/events/format";

import type { ALERTS_OFF } from "./input";
import type { ZoneShape, ZoneSummary } from "./types";

/** The choices of alert threshold, from the most to the least talkative. */
export const alertThresholdLabels: Record<HazardSeverity | typeof ALERTS_OFF, string> = {
  minor: "Every event",
  moderate: "Moderate events and above",
  severe: "Severe events and above",
  extreme: "Extreme events only",
  off: "No alerts",
};

/** Describes the alert threshold of a zone: "Alerts for severe events and above". */
export function describeAlertThreshold(alertMinSeverity: HazardSeverity | null): string {
  return alertMinSeverity
    ? `Alerts for ${alertThresholdLabels[alertMinSeverity].toLowerCase()}`
    : "Alerts off";
}

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

/**
 * Sums up the events found in a zone during a time window, such as
 * "12 events in the past 7 days, up to severe".
 */
export function describeRecentEvents(
  { recentEvents, highestSeverity }: Pick<ZoneSummary, "recentEvents" | "highestSeverity">,
  window: TimeWindow,
): string {
  const period = timeWindowLabels[window].toLowerCase();
  if (recentEvents === 0 || !highestSeverity) {
    return `No events in the ${period}`;
  }
  const severity = hazardSeverityLabels[highestSeverity].toLowerCase();
  if (recentEvents === 1) {
    return `1 ${severity} event in the ${period}`;
  }
  return `${numberFormat.format(recentEvents)} events in the ${period}, up to ${severity}`;
}
