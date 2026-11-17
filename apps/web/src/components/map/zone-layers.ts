import type { FilterSpecification, GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";

import { zoneFeatureCollection } from "@/lib/zones/geometry";
import type { ZoneShape } from "@/lib/zones/types";

const SOURCE_ID = "zone";

/** Sky blue, distinct from the warm colours of the severity scale. */
const ZONE_COLOR = "#38bdf8";

const isPart = (part: "outline" | "center"): FilterSpecification => ["==", ["get", "part"], part];

/**
 * Draws a zone on a map whose style has loaded. Layers are inserted below
 * `beforeId` when given, so that the zone never hides other markers.
 */
export function addZoneLayers(map: MapLibreMap, zone: ZoneShape | null, beforeId?: string) {
  map.addSource(SOURCE_ID, { type: "geojson", data: zoneFeatureCollection(zone) });
  map.addLayer(
    {
      id: "zone-fill",
      type: "fill",
      source: SOURCE_ID,
      filter: isPart("outline"),
      paint: { "fill-color": ZONE_COLOR, "fill-opacity": 0.1 },
    },
    beforeId,
  );
  map.addLayer(
    {
      id: "zone-outline",
      type: "line",
      source: SOURCE_ID,
      filter: isPart("outline"),
      paint: { "line-color": ZONE_COLOR, "line-width": 2 },
    },
    beforeId,
  );
  map.addLayer(
    {
      id: "zone-center",
      type: "circle",
      source: SOURCE_ID,
      filter: isPart("center"),
      paint: {
        "circle-color": ZONE_COLOR,
        "circle-radius": 4,
        "circle-stroke-color": "#0b0f14",
        "circle-stroke-width": 1.5,
      },
    },
    beforeId,
  );
}

/** Moves or resizes the zone drawn by addZoneLayers. Does nothing before the style loads. */
export function setZone(map: MapLibreMap, zone: ZoneShape | null) {
  // The returned promise only signals when the worker has indexed the data.
  void map.getSource<GeoJSONSource>(SOURCE_ID)?.setData(zoneFeatureCollection(zone));
}
