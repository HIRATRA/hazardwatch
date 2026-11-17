"use client";

import type {
  ExpressionSpecification,
  FilterSpecification,
  GeoJSONSource,
  Map as MapLibreMap,
} from "maplibre-gl";
import { useEffect, useMemo, useRef } from "react";

import { toFeatureCollection } from "@/lib/events/geojson";
import type { MapEvent } from "@/lib/events/types";

import { createMap } from "./maplibre";
import { severityStyles } from "./severity";

const SOURCE_ID = "events";
const EVENTS_LAYER_ID = "events";
const SELECTION_LAYER_ID = "events-selection";

const bySeverity = (pick: (style: (typeof severityStyles)["minor"]) => string | number) =>
  [
    "match",
    ["get", "severity"],
    "minor",
    pick(severityStyles.minor),
    "moderate",
    pick(severityStyles.moderate),
    "severe",
    pick(severityStyles.severe),
    "extreme",
    pick(severityStyles.extreme),
    pick(severityStyles.minor),
  ] satisfies ExpressionSpecification;

const markerRadius = bySeverity((style) => style.radius);

// Circles grow with the zoom level so that markers stay readable up close.
const zoomedRadius = (extra: number): ExpressionSpecification => [
  "interpolate",
  ["linear"],
  ["zoom"],
  1,
  ["+", markerRadius, extra],
  8,
  ["+", ["*", 2, markerRadius], extra],
];

const selectionFilter = (id: string | null): FilterSpecification => ["==", ["get", "id"], id ?? ""];

interface HazardMapProps {
  events: readonly MapEvent[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

/**
 * MapLibre map showing events as circles coloured by severity.
 *
 * The map instance is created once and updated imperatively when props
 * change, so React re-renders never rebuild the WebGL context.
 */
export function HazardMap({ events, selectedId, onSelect }: HazardMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);

  const data = useMemo(() => toFeatureCollection(events), [events]);

  // Latest values for handlers registered once, when the map is created.
  const latest = useRef({ data, events, selectedId, onSelect });
  useEffect(() => {
    latest.current = { data, events, selectedId, onSelect };
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const map = createMap(container);
    mapRef.current = map;

    // Fired before tiles arrive, and again when the style is rebuilt after a
    // lost WebGL context, which drops every source and layer added here.
    map.on("style.load", () => {
      map.addSource(SOURCE_ID, { type: "geojson", data: latest.current.data });
      map.addLayer({
        id: EVENTS_LAYER_ID,
        type: "circle",
        source: SOURCE_ID,
        layout: {
          // Draw the most severe events on top.
          "circle-sort-key": bySeverity((style) => style.radius),
        },
        paint: {
          "circle-color": bySeverity((style) => style.color),
          "circle-radius": zoomedRadius(0),
          "circle-opacity": 0.85,
          "circle-stroke-color": "#0b0f14",
          "circle-stroke-width": 1,
        },
      });
      map.addLayer({
        id: SELECTION_LAYER_ID,
        type: "circle",
        source: SOURCE_ID,
        filter: selectionFilter(latest.current.selectedId),
        paint: {
          "circle-color": "transparent",
          "circle-radius": zoomedRadius(5),
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
        },
      });
    });

    map.on("click", (event) => {
      const [feature] = map.getLayer(EVENTS_LAYER_ID)
        ? map.queryRenderedFeatures(event.point, { layers: [EVENTS_LAYER_ID] })
        : [];
      const id: unknown = feature?.properties.id;
      latest.current.onSelect(typeof id === "string" ? id : null);
    });
    map.on("mouseenter", EVENTS_LAYER_ID, () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", EVENTS_LAYER_ID, () => {
      map.getCanvas().style.cursor = "";
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    // The returned promise only signals when the worker has indexed the data.
    void mapRef.current?.getSource<GeoJSONSource>(SOURCE_ID)?.setData(data);
  }, [data]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    if (map.getLayer(SELECTION_LAYER_ID)) {
      map.setFilter(SELECTION_LAYER_ID, selectionFilter(selectedId));
    }

    const selected = latest.current.events.find((event) => event.id === selectedId);
    if (selected) {
      // Not marked as essential, so users who prefer reduced motion get a jump cut.
      map.flyTo({
        center: [selected.longitude, selected.latitude],
        zoom: Math.max(map.getZoom(), 4),
      });
    }
  }, [selectedId]);

  // MapLibre's unlayered stylesheet forces `position: relative` on the map
  // container, which beats Tailwind utilities, so positioning lives on a wrapper.
  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="size-full" />
    </div>
  );
}
