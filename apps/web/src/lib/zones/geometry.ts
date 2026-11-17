import type { FeatureCollection, Point, Polygon, Position } from "geojson";

import type { ZoneShape } from "./types";

/** Mean radius of the Earth, in kilometres. */
const EARTH_RADIUS_KM = 6371.0088;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
const toDegrees = (radians: number) => (radians * 180) / Math.PI;

/** Rounds a coordinate to four decimals, about ten metres. */
export function roundCoordinate(degrees: number): number {
  return Math.round(degrees * 10_000) / 10_000;
}

/** West-south and east-north corners of a box, in degrees. */
export type Bounds = [[west: number, south: number], [east: number, north: number]];

/**
 * Approximates the edge of a zone with a polygon, for display only. Points
 * are computed on a sphere, within 0.5% of the distances that PostGIS
 * measures on the WGS 84 ellipsoid. Longitudes are not wrapped, so a zone
 * that crosses the antimeridian is drawn in one piece.
 */
export function zoneOutline({ longitude, latitude, radiusKm }: ZoneShape, steps = 96): Polygon {
  const distance = radiusKm / EARTH_RADIUS_KM;
  const centerLatitude = toRadians(latitude);
  const ring: Position[] = [];

  // One extra step closes the ring on the exact first point.
  for (let step = 0; step <= steps; step++) {
    // GeoJSON expects outer rings to run counterclockwise.
    const bearing = (-2 * Math.PI * (step % steps)) / steps;
    const pointLatitude = Math.asin(
      Math.sin(centerLatitude) * Math.cos(distance) +
        Math.cos(centerLatitude) * Math.sin(distance) * Math.cos(bearing),
    );
    const longitudeOffset = Math.atan2(
      Math.sin(bearing) * Math.sin(distance) * Math.cos(centerLatitude),
      Math.cos(distance) - Math.sin(centerLatitude) * Math.sin(pointLatitude),
    );
    ring.push([longitude + toDegrees(longitudeOffset), toDegrees(pointLatitude)]);
  }

  return { type: "Polygon", coordinates: [ring] };
}

/** Smallest box containing the zone, to fit it in the map view. */
export function zoneBounds({ longitude, latitude, radiusKm }: ZoneShape): Bounds {
  const distance = radiusKm / EARTH_RADIUS_KM;
  const south = latitude - toDegrees(distance);
  const north = latitude + toDegrees(distance);

  // A zone that contains a pole spans every longitude.
  if (south <= -90 || north >= 90) {
    return [
      [-180, Math.max(south, -90)],
      [180, Math.min(north, 90)],
    ];
  }

  const longitudeOffset = toDegrees(Math.asin(Math.sin(distance) / Math.cos(toRadians(latitude))));
  return [
    [longitude - longitudeOffset, south],
    [longitude + longitudeOffset, north],
  ];
}

export interface ZoneFeatureProperties {
  part: "outline" | "center";
}

/** The outline and the centre of a zone, ready for a map source. */
export function zoneFeatureCollection(
  zone: ZoneShape | null,
): FeatureCollection<Polygon | Point, ZoneFeatureProperties> {
  if (!zone) {
    return { type: "FeatureCollection", features: [] };
  }
  return {
    type: "FeatureCollection",
    features: [
      { type: "Feature", geometry: zoneOutline(zone), properties: { part: "outline" } },
      {
        type: "Feature",
        geometry: { type: "Point", coordinates: [zone.longitude, zone.latitude] },
        properties: { part: "center" },
      },
    ],
  };
}
