import type { Map as MapLibreMap, RasterTileSource } from "maplibre-gl";

import type { ImageryTiles } from "@/lib/imagery";

/** Prefix of the sources and layers drawn by setImagery. */
const PREFIX = "imagery:";

/**
 * Source layers of the OpenMapTiles schema kept above the imagery: borders
 * and place names. Land, water and roads go below it.
 */
const OVERLAY_SOURCE_LAYERS = new Set(["boundary", "place"]);

/**
 * Draws imagery tiles over the land and water of a map whose style has
 * loaded, below borders, place names and anything added after the style.
 * Tiles already drawn are kept, so that switching back and forth or moving
 * to a newer image only loads what changed.
 */
export function setImagery(map: MapLibreMap, imagery: readonly ImageryTiles[]) {
  const wanted = new Set(imagery.map((tiles) => PREFIX + tiles.id));
  const order = map.getLayersOrder();

  for (const id of order) {
    if (id.startsWith(PREFIX) && !wanted.has(id)) {
      map.removeLayer(id);
      map.removeSource(id);
    }
  }

  const beforeId = order.find((id) => {
    const sourceLayer = map.getLayer(id)?.sourceLayer;
    return sourceLayer !== undefined && OVERLAY_SOURCE_LAYERS.has(sourceLayer);
  });

  for (const tiles of imagery) {
    const id = PREFIX + tiles.id;
    const source = map.getSource<RasterTileSource>(id);
    if (source) {
      // `tiles` is only set once the source has loaded, unlike its options.
      if (source.serialize().tiles?.[0] !== tiles.url) {
        source.setTiles([tiles.url]);
      }
      continue;
    }
    map.addSource(id, {
      type: "raster",
      tiles: [tiles.url],
      tileSize: 256,
      maxzoom: tiles.maxZoom,
      attribution: tiles.attribution,
    });
    // Each layer goes right below the overlay, hence above the previous one.
    map.addLayer({ id, type: "raster", source: id }, beforeId);
  }
}
