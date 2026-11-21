import { hazardSeverities, type HazardKind, type HazardSeverity } from "@hazardwatch/db/constants";

import { isRecent } from "@/lib/events/geojson";
import type { MapEvent } from "@/lib/events/types";
import type { Bounds } from "@/lib/imagery";

/**
 * An event placed on a still picture of an area in latitude and longitude,
 * its position given in percent of the picture from the top left corner.
 */
export interface ScenePoint {
  x: number;
  y: number;
  severity: HazardSeverity;
  kind: HazardKind;
  /** Whether the event started in the past few hours. */
  recent: boolean;
  /** Whether the event lies within the zone drawn on the picture, if any. */
  inZone: boolean;
}

/** A watch zone drawn on a picture, as a circle on the ground. */
export interface SceneZone {
  name: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
}

/** A zone as an ellipse on the picture: centre and radii, in percent of the picture. */
export interface SceneEllipse {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

/** An event shown as an alert notification. */
export interface SceneAlert {
  id: string;
  title: string;
  kind: HazardKind;
  severity: HazardSeverity;
  /** ISO 8601 time at which the event started. */
  occurredAt: string;
}

const EARTH_RADIUS_KM = 6371;
const KM_PER_DEGREE = (Math.PI * EARTH_RADIUS_KM) / 180;

const roundTenth = (value: number) => Math.round(value * 10) / 10;
const rank = (severity: HazardSeverity) => hazardSeverities.indexOf(severity);

/** Distance along the surface of the Earth, in kilometres. */
function distanceKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLatitude = toRadians(b.latitude - a.latitude);
  const dLongitude = toRadians(b.longitude - a.longitude);
  const h =
    Math.sin(dLatitude / 2) ** 2 +
    Math.cos(toRadians(a.latitude)) *
      Math.cos(toRadians(b.latitude)) *
      Math.sin(dLongitude / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/**
 * The events within an area, placed on a picture of it in the plate carrée
 * projection, where latitude and longitude grow evenly. Keeps the most
 * severe ones when there are more than `limit`, and lists them from the
 * least to the most severe, so that the most severe are drawn on top.
 */
export function placeEvents(
  events: readonly MapEvent[],
  bounds: Bounds,
  { now, limit, zone }: { now: Date; limit: number; zone?: SceneZone },
): ScenePoint[] {
  const [south, west, north, east] = bounds;
  return events
    .filter(
      ({ latitude, longitude }) =>
        latitude >= south && latitude <= north && longitude >= west && longitude <= east,
    )
    .sort((a, b) => rank(b.severity) - rank(a.severity))
    .slice(0, limit)
    .reverse()
    .map((event) => ({
      x: roundTenth(((event.longitude - west) / (east - west)) * 100),
      y: roundTenth(((north - event.latitude) / (north - south)) * 100),
      severity: event.severity,
      kind: event.kind,
      recent: isRecent(event, now),
      inZone: zone ? distanceKm(zone, event) <= zone.radiusKm : false,
    }));
}

/**
 * A zone as it looks on a plate carrée picture: an ellipse, wider than tall
 * away from the equator, where degrees of longitude shrink.
 */
export function zoneEllipse(zone: SceneZone, bounds: Bounds): SceneEllipse {
  const [south, west, north, east] = bounds;
  const latitudeSpan = zone.radiusKm / KM_PER_DEGREE;
  const longitudeSpan = latitudeSpan / Math.cos((zone.latitude * Math.PI) / 180);
  return {
    cx: roundTenth(((zone.longitude - west) / (east - west)) * 100),
    cy: roundTenth(((north - zone.latitude) / (north - south)) * 100),
    rx: roundTenth((longitudeSpan / (east - west)) * 100),
    ry: roundTenth((latitudeSpan / (north - south)) * 100),
  };
}

/**
 * Events worth an alert, to show as notifications: the most severe, and
 * among those the latest first. The most severe event of each kind comes
 * first, so that one busy kind, such as fires, does not fill the list.
 */
export function pickAlerts(events: readonly MapEvent[], count: number): SceneAlert[] {
  const sorted = [...events].sort(
    (a, b) =>
      rank(b.severity) - rank(a.severity) || Date.parse(b.occurredAt) - Date.parse(a.occurredAt),
  );
  const seen = new Set<HazardKind>();
  const leaders = sorted.filter((event) => !seen.has(event.kind) && seen.add(event.kind));
  const others = sorted.filter((event) => !leaders.includes(event));
  return [...leaders, ...others]
    .slice(0, count)
    .map(({ id, title, kind, severity, occurredAt }) => ({
      id,
      title,
      kind,
      severity,
      occurredAt,
    }));
}
