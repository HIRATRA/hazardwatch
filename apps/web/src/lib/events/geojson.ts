import type { FeatureCollection, Point } from "geojson";

import type { MapEvent } from "./types";

/** How long an event counts as recent after it started. */
export const RECENT_WINDOW_HOURS = 6;

/** Whether an event started within the recent window before `now`. */
export function isRecent(event: Pick<MapEvent, "occurredAt">, now: Date): boolean {
  const age = now.getTime() - Date.parse(event.occurredAt);
  return age < RECENT_WINDOW_HOURS * 3_600_000;
}

/** Properties carried by each map feature. Anything else is looked up by id. */
export interface EventFeatureProperties {
  id: string;
  kind: MapEvent["kind"];
  severity: MapEvent["severity"];
  /** Whether the event started recently, which the map makes pulse. */
  recent: boolean;
}

export function toFeatureCollection(
  events: readonly MapEvent[],
  now: Date,
): FeatureCollection<Point, EventFeatureProperties> {
  return {
    type: "FeatureCollection",
    features: events.map((event) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [event.longitude, event.latitude] },
      properties: {
        id: event.id,
        kind: event.kind,
        severity: event.severity,
        recent: isRecent(event, now),
      },
    })),
  };
}
