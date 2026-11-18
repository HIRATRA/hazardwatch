import "maplibre-gl/dist/maplibre-gl.css";

import {
  Map as MapLibreMap,
  NavigationControl,
  setWorkerUrl,
  type MapOptions,
  type SkySpecification,
} from "maplibre-gl";

// MapLibre 6 parses tiles in a separate worker module. Referencing it through
// `new URL(…, import.meta.url)` lets the bundler emit and serve it as an asset.
setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).toString());

/** Free OpenStreetMap vector tiles, no API key required. */
const STYLE_URL = "https://tiles.openfreemap.org/styles/dark";

/**
 * A thin blue atmosphere around the globe, which fades out as the map zooms
 * in and the globe turns into a flat map.
 */
const SKY: SkySpecification = {
  "sky-color": "#0b1220",
  "horizon-color": "#1e3a5f",
  "sky-horizon-blend": 0.6,
  "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 5, 1, 7, 0],
};

/** Zoom at which the globe fills most of the container, whatever its size. */
function wholeGlobeZoom(container: HTMLElement): number {
  const size = Math.min(container.clientWidth, container.clientHeight);
  // At zoom z, the globe is about 512 × 2^z / π pixels across.
  const zoom = Math.log2((0.85 * size * Math.PI) / 512);
  return Math.min(Math.max(zoom, 0), 2);
}

/**
 * Creates a globe with the application's basemap and controls, showing the
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
    zoom: wholeGlobeZoom(container),
    attributionControl: { compact: true },
    ...options,
  });
  // Smooth scrolling leaves the wheel to the map, which zooms with it.
  container.dataset.lenisPrevent = "";
  map.addControl(new NavigationControl({ showCompass: false }), "bottom-right");

  // The style does not set a projection, and loading it again after a lost
  // WebGL context resets the projection and the sky.
  map.on("style.load", () => {
    map.setProjection({ type: "globe" });
    map.setSky(SKY);
  });
  return map;
}
