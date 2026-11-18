/**
 * Satellite imagery from NASA GIBS (Global Imagery Browse Services), served as
 * Web Mercator tiles without an API key.
 */
const GIBS_URL = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best";

const GIBS_ATTRIBUTION =
  '<a href="https://nasa-gibs.github.io/gibs-api-docs/" target="_blank" rel="noopener">NASA GIBS</a>';

/** A layer of GIBS, as listed in its WMTS capabilities. */
export interface GibsLayer {
  /** GIBS identifier of the layer. */
  readonly id: string;
  /** Deepest zoom level with tiles. Maps scale the tiles up beyond it. */
  readonly maxZoom: number;
  readonly format: "jpg" | "png";
  readonly attribution: string;
}

/** Colours as seen by the eye, one image a day from the VIIRS instrument of NOAA-20. */
export const trueColorLayer: GibsLayer = {
  id: "VIIRS_NOAA20_CorrectedReflectance_TrueColor",
  maxZoom: 9,
  format: "jpg",
  attribution: GIBS_ATTRIBUTION,
};

const geoColorLayer = (satellite: "East" | "West"): GibsLayer => ({
  id: `GOES-${satellite}_ABI_GeoColor`,
  maxZoom: 7,
  format: "png",
  attribution: `${GIBS_ATTRIBUTION}, NOAA GOES`,
});

export const goesEastLayer = geoColorLayer("East");

/**
 * True colour by day and infrared clouds over city lights by night, every
 * ten minutes from the geostationary GOES satellites. Together they see the
 * Americas and the Pacific; GIBS has no such layer for the rest of the world.
 * GOES-East is drawn last, since it sees the Americas from straighter above.
 */
export const geostationaryLayers: readonly GibsLayer[] = [geoColorLayer("West"), goesEastLayer];

/** Earth at night, a cloud-free composite of 2016. */
export const nightLightsLayer: GibsLayer = {
  id: "VIIRS_Black_Marble",
  maxZoom: 8,
  format: "png",
  attribution: `${GIBS_ATTRIBUTION}, NASA Black Marble`,
};

const NIGHT_LIGHTS_TIME = "2016-01-01";

/** Time GIBS replaces with the latest image of a layer. */
const LATEST_TIME = "default";

/**
 * URL of a tile of a GIBS layer at `time`, an ISO 8601 date or date-time.
 * Without coordinates, the URL is a template with MapLibre placeholders.
 */
export function gibsTileUrl(
  layer: GibsLayer,
  time: string,
  { z, x, y }: { z: number | "{z}"; x: number | "{x}"; y: number | "{y}" } = {
    z: "{z}",
    x: "{x}",
    y: "{y}",
  },
): string {
  const tileMatrixSet = `GoogleMapsCompatible_Level${layer.maxZoom}`;
  return `${GIBS_URL}/${layer.id}/default/${time}/${tileMatrixSet}/${z}/${y}/${x}.${layer.format}`;
}

/**
 * Latest day the daily imagery is expected to cover in full. A satellite
 * needs the whole day to image the planet and GIBS publishes each pass a few
 * hours later, but missing passes are sometimes only filled the next day. A
 * day is shown once 30 hours have passed since it ended.
 */
export function latestCompleteDay(now: Date): string {
  const lag = (24 + 30) * 3_600_000;
  return new Date(now.getTime() - lag).toISOString().slice(0, 10);
}

/** The geostationary layers have an image every ten minutes. */
const GEOSTATIONARY_PERIOD_MS = 10 * 60_000;

/**
 * Time of the geostationary image to show, given the latest one. GIBS
 * announces an image as the latest a few minutes before it serves all its
 * tiles at that time, so the image before it is shown instead.
 */
export function settledImageTime(latest: string): string {
  return new Date(Date.parse(latest) - GEOSTATIONARY_PERIOD_MS)
    .toISOString()
    .replace(/\.\d{3}Z$/, "Z");
}

/**
 * Reads the time of the latest image of a GIBS layer, which GIBS sends with
 * every tile requested for the latest time. Returns null when it is unknown.
 */
export async function fetchLatestImageTime(
  layer: GibsLayer,
  {
    signal,
    fetch = globalThis.fetch,
  }: { signal?: AbortSignal; fetch?: typeof globalThis.fetch } = {},
): Promise<string | null> {
  try {
    const response = await fetch(gibsTileUrl(layer, LATEST_TIME, { z: 0, x: 0, y: 0 }), {
      method: "HEAD",
      cache: "no-store",
      signal: signal ?? null,
    });
    const time = response.ok ? response.headers.get("Layer-Time-Actual") : null;
    return time && !Number.isNaN(Date.parse(time)) ? time : null;
  } catch {
    return null;
  }
}

export const basemaps = ["map", "satellite", "live", "night"] as const;

/** What the map shows below the events. */
export type Basemap = (typeof basemaps)[number];

export const DEFAULT_BASEMAP: Basemap = "map";

export function isBasemap(value: unknown): value is Basemap {
  return typeof value === "string" && (basemaps as readonly string[]).includes(value);
}

/** Raster tiles to draw over the map, ready for MapLibre. */
export interface ImageryTiles {
  /** Identifier of the GIBS layer, unique within a basemap. */
  readonly id: string;
  /** URL template of the tiles. */
  readonly url: string;
  readonly maxZoom: number;
  readonly attribution: string;
}

/** Times of the geostationary images to show, by layer identifier. */
export type LiveImageTimes = Readonly<Record<string, string>>;

const tilesOf = (layer: GibsLayer, time: string): ImageryTiles => ({
  id: layer.id,
  url: gibsTileUrl(layer, time),
  maxZoom: layer.maxZoom,
  attribution: layer.attribution,
});

/**
 * Imagery of a basemap, from bottom to top. The live layers use the given
 * times when they are known, so that their tiles match and change once a new
 * image is out, and let GIBS pick the latest image until then.
 */
export function basemapImagery(
  basemap: Basemap,
  { now, liveTimes = {} }: { now: Date; liveTimes?: LiveImageTimes },
): ImageryTiles[] {
  switch (basemap) {
    case "map":
      return [];
    case "satellite":
      return [tilesOf(trueColorLayer, latestCompleteDay(now))];
    case "live":
      return geostationaryLayers.map((layer) => tilesOf(layer, liveTimes[layer.id] ?? LATEST_TIME));
    case "night":
      return [tilesOf(nightLightsLayer, NIGHT_LIGHTS_TIME)];
  }
}

/** A tile showing what a basemap looks like, or null for the plain map. */
export function basemapPreviewUrl(
  basemap: Basemap,
  { now, liveTimes = {} }: { now: Date; liveTimes?: LiveImageTimes },
): string | null {
  // Tiles of zoom level 2 around Europe and Africa, and North America for GOES.
  switch (basemap) {
    case "map":
      return null;
    case "satellite":
      return gibsTileUrl(trueColorLayer, latestCompleteDay(now), { z: 2, x: 2, y: 1 });
    case "live":
      return gibsTileUrl(goesEastLayer, liveTimes[goesEastLayer.id] ?? LATEST_TIME, {
        z: 2,
        x: 1,
        y: 1,
      });
    case "night":
      return gibsTileUrl(nightLightsLayer, NIGHT_LIGHTS_TIME, { z: 2, x: 2, y: 1 });
  }
}
