import type { Position } from "geojson";
import { describe, expect, it } from "vitest";

import { roundCoordinate, zoneBounds, zoneFeatureCollection, zoneOutline } from "./geometry";

const EARTH_RADIUS_KM = 6371.0088;
const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/** Haversine distance, independent from the code under test. */
function distanceKm(
  [fromLongitude = 0, fromLatitude = 0]: Position,
  [toLongitude = 0, toLatitude = 0]: Position,
) {
  const haversine =
    Math.sin(toRadians(toLatitude - fromLatitude) / 2) ** 2 +
    Math.cos(toRadians(fromLatitude)) *
      Math.cos(toRadians(toLatitude)) *
      Math.sin(toRadians(toLongitude - fromLongitude) / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(haversine));
}

/** Twice the signed area of a ring, positive when it runs counterclockwise. */
function signedArea(ring: Position[]) {
  let area = 0;
  for (let index = 0; index < ring.length - 1; index++) {
    const [x1 = 0, y1 = 0] = ring[index] ?? [];
    const [x2 = 0, y2 = 0] = ring[index + 1] ?? [];
    area += x1 * y2 - x2 * y1;
  }
  return area;
}

const paris = { longitude: 2.35, latitude: 48.86, radiusKm: 100 };

describe("roundCoordinate", () => {
  it("keeps four decimals", () => {
    expect(roundCoordinate(2.352_221_9)).toBe(2.3522);
    expect(roundCoordinate(-9.139_35)).toBe(-9.1393);
  });
});

describe("zoneOutline", () => {
  it("puts every point at the radius from the centre", () => {
    const [ring = []] = zoneOutline(paris).coordinates;

    expect(ring).toHaveLength(97);
    for (const point of ring) {
      expect(distanceKm([paris.longitude, paris.latitude], point)).toBeCloseTo(100, 6);
    }
  });

  it("closes the ring counterclockwise", () => {
    const [ring = []] = zoneOutline(paris, 8).coordinates;

    expect(ring.at(-1)).toEqual(ring[0]);
    expect(signedArea(ring)).toBeGreaterThan(0);
  });

  it("keeps a zone across the antimeridian in one piece", () => {
    const fiji = { longitude: 179.5, latitude: -17, radiusKm: 250 };
    const [ring = []] = zoneOutline(fiji).coordinates;
    const longitudes = ring.map(([longitude = 0]) => longitude);

    expect(Math.max(...longitudes)).toBeGreaterThan(180);
    expect(Math.max(...longitudes) - Math.min(...longitudes)).toBeLessThan(5);
  });
});

describe("zoneBounds", () => {
  it("spans one degree of latitude per 111 km", () => {
    const [[west, south], [east, north]] = zoneBounds({
      longitude: 0,
      latitude: 0,
      radiusKm: 111.19,
    });

    expect(south).toBeCloseTo(-1, 3);
    expect(north).toBeCloseTo(1, 3);
    expect(west).toBeCloseTo(-1, 3);
    expect(east).toBeCloseTo(1, 3);
  });

  it("contains the whole outline", () => {
    const [[west, south], [east, north]] = zoneBounds(paris);
    const [ring = []] = zoneOutline(paris, 360).coordinates;

    for (const [longitude = 0, latitude = 0] of ring) {
      expect(longitude).toBeGreaterThanOrEqual(west - 1e-9);
      expect(longitude).toBeLessThanOrEqual(east + 1e-9);
      expect(latitude).toBeGreaterThanOrEqual(south - 1e-9);
      expect(latitude).toBeLessThanOrEqual(north + 1e-9);
    }
    // Tight on every side, to within the spacing of the outline points.
    expect(Math.max(...ring.map(([longitude = 0]) => longitude))).toBeCloseTo(east, 3);
    expect(Math.max(...ring.map(([, latitude = 0]) => latitude))).toBeCloseTo(north, 6);
  });

  it("spans every longitude when the zone contains a pole", () => {
    expect(zoneBounds({ longitude: 40, latitude: 88, radiusKm: 500 })).toEqual([
      [-180, expect.closeTo(83.5, 1) as number],
      [180, 90],
    ]);
  });
});

describe("zoneFeatureCollection", () => {
  it("holds the outline and the centre of the zone", () => {
    const { features } = zoneFeatureCollection(paris);

    expect(features.map((feature) => feature.properties.part)).toEqual(["outline", "center"]);
    expect(features[1]?.geometry).toEqual({ type: "Point", coordinates: [2.35, 48.86] });
  });

  it("is empty without a zone", () => {
    expect(zoneFeatureCollection(null).features).toEqual([]);
  });
});
