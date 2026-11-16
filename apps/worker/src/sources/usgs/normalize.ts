import { hazardSeverities, type HazardSeverity } from "@hazardwatch/db";

import type { IngestedEvent } from "../types.js";
import type { PagerAlert, UsgsFeature } from "./schema.js";

const severityByPagerAlert: Record<PagerAlert, HazardSeverity> = {
  green: "minor",
  yellow: "moderate",
  orange: "severe",
  red: "extreme",
};

/**
 * Severity implied by magnitude alone, following the usual descriptors:
 * moderate from 5.0, strong from 6.0 and major from 7.0.
 */
export function severityFromMagnitude(magnitude: number | null | undefined): HazardSeverity {
  if (magnitude == null || magnitude < 5) {
    return "minor";
  }
  if (magnitude < 6) {
    return "moderate";
  }
  if (magnitude < 7) {
    return "severe";
  }
  return "extreme";
}

/**
 * Magnitude measures the energy released, while the PAGER alert estimates
 * human and economic impact. Keeping the higher of the two means a large
 * offshore earthquake stays significant even when little damage is
 * expected, and a moderate one under a city is raised by its alert.
 */
export function earthquakeSeverity(
  magnitude: number | null | undefined,
  alert: PagerAlert | null | undefined,
): HazardSeverity {
  const fromMagnitude = severityFromMagnitude(magnitude);
  if (alert == null) {
    return fromMagnitude;
  }
  const fromAlert = severityByPagerAlert[alert];
  return hazardSeverities.indexOf(fromAlert) > hazardSeverities.indexOf(fromMagnitude)
    ? fromAlert
    : fromMagnitude;
}

/** Maps a validated USGS feature to the normalised event shape. */
export function toIngestedEvent({ id, properties, geometry }: UsgsFeature): IngestedEvent {
  const [longitude, latitude, depthKm] = geometry.coordinates;

  return {
    source: "usgs",
    externalId: id,
    kind: "earthquake",
    severity: earthquakeSeverity(properties.mag, properties.alert),
    title: properties.title,
    url: properties.url,
    location: { x: longitude, y: latitude },
    properties: {
      magnitude: properties.mag ?? null,
      magnitudeType: properties.magType ?? null,
      depthKm,
      place: properties.place ?? null,
      pagerAlert: properties.alert ?? null,
      tsunamiFlag: properties.tsunami === 1,
      feltReports: properties.felt ?? null,
      significance: properties.sig ?? null,
      reviewStatus: properties.status ?? null,
      network: properties.net ?? null,
    },
    occurredAt: new Date(properties.time),
    sourceUpdatedAt: properties.updated == null ? null : new Date(properties.updated),
  };
}
