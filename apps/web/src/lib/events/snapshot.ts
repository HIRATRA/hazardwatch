import type { HazardKind } from "@hazardwatch/db/constants";

import {
  coastlinesLayer,
  fireDetectionsLayer,
  gibsImageUrl,
  trueColorLayer,
  type Bounds,
} from "@/lib/imagery";

import type { MapEvent } from "./types";

/** Size of the picture, twice the size it is shown at for sharp screens. */
export const SNAPSHOT_WIDTH = 640;
export const SNAPSHOT_HEIGHT = 400;

/**
 * Half the height of the area shown around an event, in degrees of
 * latitude, about 111 km each: close enough to see the smoke of a fire,
 * wide enough to take in a cyclone.
 */
const halfHeights: Record<HazardKind, number> = {
  volcano: 0.8,
  wildfire: 1.2,
  earthquake: 2,
  flood: 2.5,
  drought: 4,
  tropical_cyclone: 6,
};

const round = (value: number) => Math.round(value * 1000) / 1000;

export interface SnapshotFrame {
  bounds: Bounds;
  /** Where the event lies in the picture, from 0 to 1 across and down. */
  marker: { x: number; y: number };
}

/**
 * The area to picture around an event, as wide as the picture's shape
 * needs at its latitude, where degrees of longitude shrink. The area stays
 * within the map's edges, so near the poles or the date line the event is
 * off centre.
 */
export function snapshotFrame(
  event: Pick<MapEvent, "kind" | "latitude" | "longitude">,
): SnapshotFrame {
  const halfHeight = halfHeights[event.kind];
  let south = event.latitude - halfHeight;
  let north = event.latitude + halfHeight;
  if (north > 90) {
    south -= north - 90;
    north = 90;
  }
  if (south < -90) {
    north += -90 - south;
    south = -90;
  }

  const latitude = ((south + north) / 2) * (Math.PI / 180);
  const halfWidth = Math.min(
    (halfHeight * SNAPSHOT_WIDTH) / SNAPSHOT_HEIGHT / Math.max(Math.cos(latitude), 0.2),
    180,
  );
  let west = event.longitude - halfWidth;
  let east = event.longitude + halfWidth;
  if (west < -180) {
    east += -180 - west;
    west = -180;
  }
  if (east > 180) {
    west -= east - 180;
    east = 180;
  }

  return {
    bounds: [round(south), round(west), round(north), round(east)],
    marker: {
      x: (event.longitude - west) / (east - west),
      y: (north - event.latitude) / (north - south),
    },
  };
}

/** URL of the picture of a frame on a day: true colour, fires in red and coastlines. */
export function snapshotUrl(frame: SnapshotFrame, day: string): string {
  return gibsImageUrl([trueColorLayer, fireDetectionsLayer, coastlinesLayer], {
    bounds: frame.bounds,
    time: day,
    width: SNAPSHOT_WIDTH,
    height: SNAPSHOT_HEIGHT,
  });
}

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

const toDay = (time: number) => new Date(time).toISOString().slice(0, 10);

/** The day before or after a day, as YYYY-MM-DD. */
export function shiftDay(day: string, days: number): string {
  return toDay(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS);
}

/**
 * Latest day pictured at a longitude. NOAA-20 flies over every place
 * around 13:30 local solar time, and its images reach GIBS about three
 * hours later, so today's image of the east comes out before that of the
 * west, which only appears the next day, UTC.
 */
export function latestPicturedDay(longitude: number, now: Date): string {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const available = today + (17 - longitude / 15) * HOUR_MS;
  return toDay(now.getTime() >= available ? today : today - DAY_MS);
}

export interface SnapshotDays {
  /** Earliest day offered: a week before the event, to compare. */
  first: string;
  /** Latest day pictured at the event. */
  last: string;
  /** Day shown first: the last day of activity, or the latest pictured. */
  initial: string;
}

export function snapshotDays(
  event: Pick<MapEvent, "longitude" | "occurredAt" | "activeUntil">,
  now: Date,
): SnapshotDays {
  const last = latestPicturedDay(event.longitude, now);
  const active = toDay(Date.parse(event.activeUntil));
  const initial = active < last ? active : last;
  const weekBefore = toDay(Date.parse(event.occurredAt) - 7 * DAY_MS);
  return { first: weekBefore < initial ? weekBefore : initial, last, initial };
}
