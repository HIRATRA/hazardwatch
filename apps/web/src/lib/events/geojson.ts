import type { FeatureCollection, Point } from "geojson";

import type { MapEvent } from "./types";

/** Properties carried by each map feature. Anything else is looked up by id. */
export interface EventFeatureProperties {
  id: string;
  severity: MapEvent["severity"];
}

export function toFeatureCollection(
  events: readonly MapEvent[],
): FeatureCollection<Point, EventFeatureProperties> {
  return {
    type: "FeatureCollection",
    features: events.map((event) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [event.longitude, event.latitude] },
      properties: { id: event.id, severity: event.severity },
    })),
  };
}
