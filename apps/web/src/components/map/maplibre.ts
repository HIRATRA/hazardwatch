import "maplibre-gl/dist/maplibre-gl.css";

import { Map as MapLibreMap, NavigationControl, setWorkerUrl, type MapOptions } from "maplibre-gl";

// MapLibre 6 parses tiles in a separate worker module. Referencing it through
// `new URL(…, import.meta.url)` lets the bundler emit and serve it as an asset.
setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).toString());

/** Free OpenStreetMap vector tiles, no API key required. */
const STYLE_URL = "https://tiles.openfreemap.org/styles/dark";

/**
 * Creates a map with the application's basemap and controls, showing the
 * whole world unless the options set another view.
 */
export function createMap(
  container: HTMLElement,
  options: Omit<Partial<MapOptions>, "container" | "style"> = {},
): MapLibreMap {
  const map = new MapLibreMap({
    container,
    style: STYLE_URL,
    center: [10, 20],
    zoom: 1.3,
    attributionControl: { compact: true },
    ...options,
  });
  map.addControl(new NavigationControl({ showCompass: false }), "top-right");
  return map;
}
