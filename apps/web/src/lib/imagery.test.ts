import { describe, expect, it, vi } from "vitest";

import {
  basemapImagery,
  basemapPreviewUrl,
  fetchLatestImageTime,
  gibsTileUrl,
  goesEastLayer,
  isBasemap,
  latestCompleteDay,
  settledImageTime,
  trueColorLayer,
} from "./imagery";

const GIBS_URL = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best";

describe("gibsTileUrl", () => {
  it("builds a MapLibre template from the layer", () => {
    expect(gibsTileUrl(trueColorLayer, "2026-11-17")).toBe(
      `${GIBS_URL}/VIIRS_NOAA20_CorrectedReflectance_TrueColor/default/2026-11-17/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`,
    );
  });

  it("builds the URL of a single tile, row before column", () => {
    expect(gibsTileUrl(goesEastLayer, "default", { z: 2, x: 1, y: 3 })).toBe(
      `${GIBS_URL}/GOES-East_ABI_GeoColor/default/default/GoogleMapsCompatible_Level7/2/3/1.png`,
    );
  });
});

describe("latestCompleteDay", () => {
  it("is the day before yesterday once the morning has passed, UTC", () => {
    expect(latestCompleteDay(new Date("2026-11-18T13:00:00Z"))).toBe("2026-11-16");
    expect(latestCompleteDay(new Date("2026-11-18T06:00:00Z"))).toBe("2026-11-16");
  });

  it("goes back three days early in the morning", () => {
    expect(latestCompleteDay(new Date("2026-11-18T05:59:00Z"))).toBe("2026-11-15");
  });
});

describe("settledImageTime", () => {
  it("steps back to the previous image", () => {
    expect(settledImageTime("2026-11-18T12:50:00Z")).toBe("2026-11-18T12:40:00Z");
    expect(settledImageTime("2026-11-18T00:00:00Z")).toBe("2026-11-17T23:50:00Z");
  });
});

describe("fetchLatestImageTime", () => {
  const respond = (init: ResponseInit) =>
    vi.fn<typeof fetch>().mockResolvedValue(new Response(null, init));

  it("reads the time GIBS picked for the latest image", async () => {
    const fetch = respond({ headers: { "Layer-Time-Actual": "2026-11-18T12:20:00Z" } });

    await expect(fetchLatestImageTime(goesEastLayer, { fetch })).resolves.toBe(
      "2026-11-18T12:20:00Z",
    );
    expect(fetch).toHaveBeenCalledWith(
      `${GIBS_URL}/GOES-East_ABI_GeoColor/default/default/GoogleMapsCompatible_Level7/0/0/0.png`,
      expect.objectContaining({ method: "HEAD" }),
    );
  });

  it("returns null without a valid time", async () => {
    await expect(
      fetchLatestImageTime(goesEastLayer, { fetch: respond({ status: 404 }) }),
    ).resolves.toBeNull();
    await expect(fetchLatestImageTime(goesEastLayer, { fetch: respond({}) })).resolves.toBeNull();
    await expect(
      fetchLatestImageTime(goesEastLayer, {
        fetch: respond({ headers: { "Layer-Time-Actual": "soon" } }),
      }),
    ).resolves.toBeNull();
  });

  it("returns null when the request fails", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockRejectedValue(new TypeError("offline"));

    await expect(fetchLatestImageTime(goesEastLayer, { fetch })).resolves.toBeNull();
  });
});

describe("isBasemap", () => {
  it("accepts known basemaps only", () => {
    expect(isBasemap("satellite")).toBe(true);
    expect(isBasemap("terrain")).toBe(false);
    expect(isBasemap(null)).toBe(false);
  });
});

describe("basemapImagery", () => {
  const now = new Date("2026-11-18T13:00:00Z");

  it("draws nothing over the plain map", () => {
    expect(basemapImagery("map", { now })).toEqual([]);
  });

  it("shows the latest complete day of true colour imagery", () => {
    const [tiles, ...rest] = basemapImagery("satellite", { now });

    expect(rest).toEqual([]);
    expect(tiles?.url).toContain("/2026-11-16/");
    expect(tiles?.maxZoom).toBe(9);
  });

  it("shows each geostationary layer at its latest time, GOES-East on top", () => {
    const imagery = basemapImagery("live", {
      now,
      liveTimes: { "GOES-East_ABI_GeoColor": "2026-11-18T12:20:00Z" },
    });

    expect(imagery.map((tiles) => tiles.id)).toEqual([
      "GOES-West_ABI_GeoColor",
      "GOES-East_ABI_GeoColor",
    ]);
    expect(imagery[0]?.url).toContain("/default/default/");
    expect(imagery[1]?.url).toContain("/default/2026-11-18T12:20:00Z/");
  });

  it("shows night lights from their only composite", () => {
    expect(basemapImagery("night", { now })[0]?.url).toContain(
      "VIIRS_Black_Marble/default/2016-01-01/",
    );
  });
});

describe("basemapPreviewUrl", () => {
  const now = new Date("2026-11-18T13:00:00Z");

  it("has a tile for each imagery basemap", () => {
    expect(basemapPreviewUrl("map", { now })).toBeNull();
    expect(basemapPreviewUrl("satellite", { now })).toMatch(/\/2026-11-16\/.*\/2\/1\/2\.jpg$/);
    expect(basemapPreviewUrl("live", { now })).toMatch(/GOES-East.*\/2\/1\/1\.png$/);
    expect(basemapPreviewUrl("night", { now })).toMatch(/Black_Marble.*\/2\/1\/2\.png$/);
  });
});
