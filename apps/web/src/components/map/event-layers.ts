import type { HazardSeverity } from "@hazardwatch/db/constants";
import type { FeatureCollection, Point } from "geojson";
import type {
  ExpressionSpecification,
  FilterSpecification,
  GeoJSONSource,
  Map as MapLibreMap,
} from "maplibre-gl";

import type { EventFeatureProperties } from "@/lib/events/geojson";

import { severityStyles } from "./severity";

type EventData = FeatureCollection<Point, EventFeatureProperties>;

/** Events, merged into clusters when zoomed out. */
const SOURCE_ID = "events";
/** The same events never clustered, for the heat of fires. */
const HEAT_SOURCE_ID = "events-heat";

const HEAT_LAYER_ID = "events-heat";
const PULSE_LAYER_ID = "events-pulse";
export const CLUSTERS_LAYER_ID = "events-clusters";
const CLUSTER_COUNTS_LAYER_ID = "events-cluster-counts";
export const EVENTS_LAYER_ID = "events";
const SELECTION_LAYER_ID = "events-selection";

/** Distance on screen, in pixels, under which events merge into a cluster. */
const CLUSTER_RADIUS = 24;
/**
 * Deepest zoom with clusters. From the next one, about a country across,
 * every event shows on its own, which is the zoom selecting one flies to.
 */
const CLUSTER_MAX_ZOOM = 3;

type SeverityStyle = (typeof severityStyles)[HazardSeverity];

const severityRank: ExpressionSpecification = [
  "match",
  ["get", "severity"],
  "minor",
  0,
  "moderate",
  1,
  "severe",
  2,
  "extreme",
  3,
  0,
];

/** Picks a style value from the severity of an event, or the highest one of a cluster. */
const bySeverity = (pick: (style: SeverityStyle) => string | number): ExpressionSpecification => [
  "case",
  ["has", "point_count"],
  [
    "match",
    ["get", "rank"],
    1,
    pick(severityStyles.moderate),
    2,
    pick(severityStyles.severe),
    3,
    pick(severityStyles.extreme),
    pick(severityStyles.minor),
  ],
  [
    "match",
    ["get", "severity"],
    "moderate",
    pick(severityStyles.moderate),
    "severe",
    pick(severityStyles.severe),
    "extreme",
    pick(severityStyles.extreme),
    pick(severityStyles.minor),
  ],
];

const markerRadius = bySeverity((style) => style.radius);

/** Clusters grow with the number of events they hold. */
const clusterRadius: ExpressionSpecification = [
  "step",
  ["get", "point_count"],
  11,
  10,
  14,
  50,
  17,
  200,
  21,
];

const isCluster: FilterSpecification = ["has", "point_count"];
const isEvent: FilterSpecification = ["!", ["has", "point_count"]];

const hovered: ExpressionSpecification = ["boolean", ["feature-state", "hover"], false];

/**
 * Radius of the markers, plus `extra` pixels. Markers grow with the zoom
 * level so that they stay readable up close, while clusters keep their size.
 */
const radius = (extra: number | ExpressionSpecification): ExpressionSpecification => [
  "interpolate",
  ["linear"],
  ["zoom"],
  1,
  ["+", ["case", ["has", "point_count"], clusterRadius, markerRadius], extra],
  8,
  ["+", ["case", ["has", "point_count"], clusterRadius, ["*", 2, markerRadius]], extra],
];

const selectionFilter = (id: string | null): FilterSpecification => [
  "all",
  isEvent,
  ["==", ["get", "id"], id ?? ""],
];

const PULSE_PERIOD_MS = 2_400;
const PULSE_FRAME_MS = 1_000 / 30;
/** How far a ring grows beyond its marker, in pixels. */
const PULSE_GROWTH = 16;
/** Moment of the pulse shown still to users who prefer reduced motion. */
const STILL_PHASE = 0.4;

/** Size and opacity of the rings at a moment of the pulse, from 0 to 1. */
function pulsePaint(phase: number) {
  // Rings spread out fast, then slow down as they fade.
  const spread = 1 - (1 - phase) ** 3;
  return { radius: radius(2 + spread * PULSE_GROWTH), opacity: 0.9 * (1 - phase) };
}

/**
 * Adds the event sources and layers to a map whose style has loaded, above
 * everything drawn before:
 *
 * - the heat of fires, which fades out as the map zooms in;
 * - rings pulsing around recent events, and clusters holding some;
 * - clusters with their number of events, coloured by their most severe;
 * - events coloured and sized by severity, and the selected one.
 */
export function addEventLayers(map: MapLibreMap, data: EventData, selectedId: string | null) {
  map.addSource(SOURCE_ID, {
    type: "geojson",
    data,
    // Numbers clusters and events alike, so that both can be highlighted.
    generateId: true,
    cluster: true,
    clusterRadius: CLUSTER_RADIUS,
    clusterMaxZoom: CLUSTER_MAX_ZOOM,
    clusterProperties: {
      rank: ["max", severityRank],
      recent: ["+", ["case", ["get", "recent"], 1, 0]],
    },
  });
  map.addSource(HEAT_SOURCE_ID, { type: "geojson", data });

  map.addLayer({
    id: HEAT_LAYER_ID,
    type: "heatmap",
    source: HEAT_SOURCE_ID,
    filter: ["==", ["get", "kind"], "wildfire"],
    maxzoom: 9,
    paint: {
      "heatmap-weight": ["interpolate", ["linear"], severityRank, 0, 0.5, 3, 1],
      "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 0.8, 8, 2],
      "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 8, 4, 20, 8, 36],
      "heatmap-color": [
        "interpolate",
        ["linear"],
        ["heatmap-density"],
        0,
        "rgba(0, 0, 0, 0)",
        0.15,
        "rgba(127, 29, 29, 0.4)",
        0.4,
        "rgba(234, 88, 12, 0.6)",
        0.7,
        "rgba(251, 146, 60, 0.75)",
        1,
        "rgba(254, 240, 138, 0.85)",
      ],
      "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 5, 0.8, 9, 0],
    },
  });

  map.addLayer({
    id: PULSE_LAYER_ID,
    type: "circle",
    source: SOURCE_ID,
    filter: ["to-boolean", ["get", "recent"]],
    paint: {
      "circle-color": "transparent",
      // Still until startPulse animates them.
      "circle-radius": pulsePaint(STILL_PHASE).radius,
      "circle-stroke-color": bySeverity((style) => style.color),
      "circle-stroke-width": 2,
      "circle-stroke-opacity": pulsePaint(STILL_PHASE).opacity,
    },
  });

  map.addLayer({
    id: CLUSTERS_LAYER_ID,
    type: "circle",
    source: SOURCE_ID,
    filter: isCluster,
    paint: {
      "circle-color": bySeverity((style) => style.color),
      "circle-radius": radius(["case", hovered, 2, 0]),
      "circle-opacity": 0.9,
      "circle-stroke-color": ["case", hovered, "#ffffff", "rgba(11, 15, 20, 0.6)"],
      "circle-stroke-width": ["case", hovered, 2, 3],
    },
  });
  map.addLayer({
    id: CLUSTER_COUNTS_LAYER_ID,
    type: "symbol",
    source: SOURCE_ID,
    filter: isCluster,
    layout: {
      "text-field": ["get", "point_count_abbreviated"],
      "text-font": ["Noto Sans Bold"],
      "text-size": 11,
      "text-allow-overlap": true,
      "text-ignore-placement": true,
    },
    paint: { "text-color": "#0b0f14" },
  });

  map.addLayer({
    id: EVENTS_LAYER_ID,
    type: "circle",
    source: SOURCE_ID,
    filter: isEvent,
    layout: {
      // Draw the most severe events on top.
      "circle-sort-key": severityRank,
    },
    paint: {
      "circle-color": bySeverity((style) => style.color),
      "circle-radius": radius(["case", hovered, 2, 0]),
      "circle-opacity": 0.85,
      "circle-stroke-color": ["case", hovered, "#ffffff", "#0b0f14"],
      "circle-stroke-width": ["case", hovered, 2, 1],
    },
  });
  map.addLayer({
    id: SELECTION_LAYER_ID,
    type: "circle",
    source: SOURCE_ID,
    filter: selectionFilter(selectedId),
    paint: {
      "circle-color": "transparent",
      "circle-radius": radius(5),
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 2,
    },
  });
}

/** Replaces the events drawn by addEventLayers. Does nothing before the style loads. */
export function setEventData(map: MapLibreMap, data: EventData) {
  // The returned promises only signal when the worker has indexed the data.
  void map.getSource<GeoJSONSource>(SOURCE_ID)?.setData(data);
  void map.getSource<GeoJSONSource>(HEAT_SOURCE_ID)?.setData(data);
}

export function setSelectedEvent(map: MapLibreMap, id: string | null) {
  if (map.getLayer(SELECTION_LAYER_ID)) {
    map.setFilter(SELECTION_LAYER_ID, selectionFilter(id));
  }
}

/** Highlights the event or cluster under the pointer, or none. */
export function setHovered(map: MapLibreMap, id: number | string | undefined) {
  if (!map.getSource(SOURCE_ID)) {
    return;
  }
  map.removeFeatureState({ source: SOURCE_ID });
  if (id !== undefined) {
    map.setFeatureState({ source: SOURCE_ID, id }, { hover: true });
  }
}

/** Zoom at which a cluster splits into smaller ones or events. */
export function clusterExpansionZoom(map: MapLibreMap, clusterId: number): Promise<number> {
  const source = map.getSource<GeoJSONSource>(SOURCE_ID);
  return source
    ? source.getClusterExpansionZoom(clusterId)
    : Promise.reject(new Error("No events"));
}

function drawPulse(map: MapLibreMap, phase: number) {
  if (!map.getLayer(PULSE_LAYER_ID)) {
    return;
  }
  const paint = pulsePaint(phase);
  // Expressions built here are known to be valid, so skip validating them on every frame.
  map.setPaintProperty(PULSE_LAYER_ID, "circle-radius", paint.radius, { validate: false });
  map.setPaintProperty(PULSE_LAYER_ID, "circle-stroke-opacity", paint.opacity, {
    validate: false,
  });
}

/**
 * Makes the rings around recent events and the clusters holding some pulse,
 * until the returned function is called. Users who prefer reduced motion
 * keep still rings.
 */
export function startPulse(map: MapLibreMap, { reducedMotion }: { reducedMotion: boolean }) {
  if (reducedMotion) {
    return () => undefined;
  }
  let drawnAt = -Infinity;
  let frame = requestAnimationFrame(function step(time) {
    // Every drawing redraws the whole map, and a pulse this slow looks as
    // smooth at half the usual frame rate.
    if (time - drawnAt >= PULSE_FRAME_MS) {
      drawnAt = time;
      drawPulse(map, (time % PULSE_PERIOD_MS) / PULSE_PERIOD_MS);
    }
    frame = requestAnimationFrame(step);
  });
  return () => cancelAnimationFrame(frame);
}
