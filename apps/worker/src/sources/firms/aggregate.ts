import type { HazardSeverity } from "@hazardwatch/db";

import type { IngestedEvent } from "../types.js";
import type { Detection } from "./parse.js";

/** Side of a grid cell, in degrees: about 28 km at the equator. */
export const CELL_SIZE_DEGREES = 0.25;

/**
 * Severity by fire radiative power within a cell, in megawatts, from the
 * highest threshold down. Cells below the lowest are left out: they are
 * mostly small agricultural burns and would drown the map.
 */
const SEVERITY_THRESHOLDS: readonly (readonly [HazardSeverity, number])[] = [
  ["extreme", 2500],
  ["severe", 1000],
  ["moderate", 500],
  ["minor", 250],
];

export function severityForPower(frpMw: number): HazardSeverity | null {
  return SEVERITY_THRESHOLDS.find(([, threshold]) => frpMw >= threshold)?.[0] ?? null;
}

interface Cell {
  row: number;
  column: number;
  detections: number;
  highConfidence: number;
  latitudeSum: number;
  longitudeSum: number;
  first: Date;
  last: Date;
  peakFrp: number;
  /** Fire radiative power by satellite, which may see the same fire twice. */
  frpBySatellite: Map<string, number>;
}

/**
 * Groups detections into fires: one event per cell of a 0.25° grid with
 * enough activity. The power of a cell is the highest total seen by a single
 * satellite, since two satellites passing over the same fire would otherwise
 * count it twice. Low-confidence detections are ignored.
 */
export function toFireEvents(detections: readonly Detection[]): IngestedEvent[] {
  const cells = new Map<string, Cell>();

  for (const detection of detections) {
    if (detection.confidence === "low") {
      continue;
    }
    const row = Math.floor(detection.latitude / CELL_SIZE_DEGREES);
    const column = Math.floor(detection.longitude / CELL_SIZE_DEGREES);
    const key = `${row}/${column}`;
    let cell = cells.get(key);
    if (!cell) {
      cell = {
        row,
        column,
        detections: 0,
        highConfidence: 0,
        latitudeSum: 0,
        longitudeSum: 0,
        first: detection.detectedAt,
        last: detection.detectedAt,
        peakFrp: 0,
        frpBySatellite: new Map(),
      };
      cells.set(key, cell);
    }
    cell.detections += 1;
    cell.highConfidence += detection.confidence === "high" ? 1 : 0;
    cell.latitudeSum += detection.latitude;
    cell.longitudeSum += detection.longitude;
    cell.first = detection.detectedAt < cell.first ? detection.detectedAt : cell.first;
    cell.last = detection.detectedAt > cell.last ? detection.detectedAt : cell.last;
    cell.peakFrp = Math.max(cell.peakFrp, detection.frp);
    cell.frpBySatellite.set(
      detection.satellite,
      (cell.frpBySatellite.get(detection.satellite) ?? 0) + detection.frp,
    );
  }

  const events: IngestedEvent[] = [];
  for (const cell of cells.values()) {
    const frpMw = Math.max(...cell.frpBySatellite.values());
    const severity = severityForPower(frpMw);
    if (!severity) {
      continue;
    }
    const latitude = cell.latitudeSum / cell.detections;
    const longitude = cell.longitudeSum / cell.detections;
    events.push({
      source: "nasa_firms",
      externalId: `${CELL_SIZE_DEGREES}/${cell.row}/${cell.column}`,
      kind: "wildfire",
      severity,
      title: `${cell.detections} fire hotspots seen by satellite`,
      url: firmsMapUrl(latitude, longitude),
      location: { x: longitude, y: latitude },
      properties: {
        hotspots: cell.detections,
        highConfidenceHotspots: cell.highConfidence,
        frpMw: Math.round(frpMw),
        peakFrpMw: Math.round(cell.peakFrp),
        satellites: [...cell.frpBySatellite.keys()].sort(),
        cellSizeDegrees: CELL_SIZE_DEGREES,
      },
      occurredAt: cell.first,
      activeUntil: cell.last,
      // The files carry no revision time, and their window moves on anyway.
      sourceUpdatedAt: null,
    });
  }
  return events;
}

/** The FIRMS fire map, centred on a place and showing the past 24 hours. */
function firmsMapUrl(latitude: number, longitude: number): string {
  return `https://firms.modaps.eosdis.nasa.gov/map/#d:24hrs;@${longitude.toFixed(2)},${latitude.toFixed(2)},9.0z`;
}
