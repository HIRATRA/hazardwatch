import { hazardSeverities } from "@hazardwatch/db/constants";

import { isRecent } from "@/lib/events/geojson";
import type { MapEvent } from "@/lib/events/types";

import type { EarthEvent } from "./seismic-earth";

const roundTenth = (value: number) => Math.round(value * 10) / 10;

/**
 * Events as peaks of the seismogram, compact enough to send to the browser:
 * a tenth of a degree is far finer than one line of the drawing.
 */
export function toEarthEvents(events: readonly MapEvent[], now: Date): EarthEvent[] {
  return events.map((event) => [
    roundTenth(event.longitude),
    roundTenth(event.latitude),
    hazardSeverities.indexOf(event.severity),
    isRecent(event, now) ? 1 : 0,
  ]);
}
