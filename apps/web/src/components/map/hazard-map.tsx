"use client";

import type { Point } from "geojson";
import {
  Popup,
  type Map as MapLibreMap,
  type MapGeoJSONFeature,
  type PointLike,
} from "maplibre-gl";
import { useEffect, useMemo, useRef } from "react";

import { toFeatureCollection } from "@/lib/events/geojson";
import type { MapEvent } from "@/lib/events/types";
import type { ImageryTiles } from "@/lib/imagery";
import { zoneBounds } from "@/lib/zones/geometry";
import type { ZoneShape } from "@/lib/zones/types";

import {
  addEventLayers,
  clusterExpansionZoom,
  CLUSTERS_LAYER_ID,
  EVENTS_LAYER_ID,
  setEventData,
  setHovered,
  setSelectedEvent,
  startPulse,
} from "./event-layers";
import { setImagery } from "./imagery-layers";
import { createMap } from "./maplibre";
import { addZoneLayers } from "./zone-layers";

const INTERACTIVE_LAYERS = [CLUSTERS_LAYER_ID, EVENTS_LAYER_ID];

const isCluster = (feature: MapGeoJSONFeature) => feature.properties.cluster === true;

/** Text describing a cluster: its number of events, and of recent ones. */
function describeCluster(feature: MapGeoJSONFeature): string {
  const count = Number(feature.properties.point_count);
  const recent = Number(feature.properties.recent);
  const events = `${count} events`;
  return recent > 0 ? `${events}, ${recent} new` : events;
}

interface HazardMapProps {
  events: readonly MapEvent[];
  /** ISO 8601 reference time, provided by the server, deciding which events are recent. */
  now: string;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /**
   * Watch zone to outline below the events. The map opens on it, and it is
   * read once, when the map is created.
   */
  zone?: ZoneShape | undefined;
  /** Satellite imagery drawn below borders, place names and events. */
  imagery: readonly ImageryTiles[];
}

/**
 * MapLibre map showing events as circles coloured by severity, merged into
 * clusters when zoomed out, with the heat of fires below them and rings
 * pulsing around recent ones.
 *
 * The map instance is created once and updated imperatively when props
 * change, so React re-renders never rebuild the WebGL context.
 */
export function HazardMap({ events, now, selectedId, onSelect, zone, imagery }: HazardMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);

  const data = useMemo(() => toFeatureCollection(events, new Date(now)), [events, now]);
  const hasRecent = data.features.some((feature) => feature.properties.recent);

  // Latest values for handlers registered once, when the map is created.
  const latest = useRef({ data, events, selectedId, onSelect, zone, imagery });
  useEffect(() => {
    latest.current = { data, events, selectedId, onSelect, zone, imagery };
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const initialZone = latest.current.zone;
    const map = createMap(
      container,
      initialZone ? { bounds: zoneBounds(initialZone), fitBoundsOptions: { padding: 40 } } : {},
    );
    mapRef.current = map;

    // Fired before tiles arrive, and again when the style is rebuilt after a
    // lost WebGL context, which drops every source and layer added here.
    map.on("style.load", () => {
      setImagery(map, latest.current.imagery);
      if (initialZone) {
        addZoneLayers(map, initialZone);
      }
      addEventLayers(map, latest.current.data, latest.current.selectedId);
    });

    const featureAt = (point: PointLike) =>
      map.getLayer(EVENTS_LAYER_ID)
        ? map.queryRenderedFeatures(point, { layers: INTERACTIVE_LAYERS })[0]
        : undefined;

    // A cluster opens up to its events, an event is selected, and a click
    // anywhere else clears the selection.
    map.on("click", (event) => {
      const feature = featureAt(event.point);
      if (feature && isCluster(feature)) {
        const center = (feature.geometry as Point).coordinates as [number, number];
        clusterExpansionZoom(map, Number(feature.properties.cluster_id))
          .then((zoom) => map.easeTo({ center, zoom }))
          .catch(() => undefined);
        return;
      }
      const id: unknown = feature?.properties.id;
      latest.current.onSelect(typeof id === "string" ? id : null);
    });

    // The pointer highlights what it is over and names it in a tooltip.
    const tooltip = new Popup({
      className: "hazard-tooltip",
      closeButton: false,
      closeOnClick: false,
      offset: 14,
      maxWidth: "260px",
    });
    let hoveredId: number | string | undefined;
    map.on("mousemove", (event) => {
      const feature = featureAt(event.point);
      if (feature?.id === hoveredId) {
        return;
      }
      hoveredId = feature?.id;
      setHovered(map, hoveredId);
      map.getCanvas().style.cursor = feature ? "pointer" : "";

      const id: unknown = feature?.properties.id;
      const text =
        feature && isCluster(feature)
          ? describeCluster(feature)
          : latest.current.events.find((candidate) => candidate.id === id)?.title;
      if (feature && text) {
        const coordinates = (feature.geometry as Point).coordinates as [number, number];
        tooltip.setLngLat(coordinates).setText(text).addTo(map);
      } else {
        tooltip.remove();
      }
    });
    map.getCanvas().addEventListener("mouseleave", () => {
      hoveredId = undefined;
      setHovered(map, undefined);
      tooltip.remove();
    });

    return () => {
      tooltip.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (map) {
      setEventData(map, data);
    }
  }, [data]);

  // Animating redraws the map on every frame, so it only runs while some
  // event is recent.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !hasRecent) {
      return;
    }
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return startPulse(map, { reducedMotion });
  }, [hasRecent]);

  useEffect(() => {
    const map = mapRef.current;
    // Before the style loads, its handler draws the latest imagery.
    if (map?.getLayer(EVENTS_LAYER_ID)) {
      setImagery(map, imagery);
    }
  }, [imagery]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    setSelectedEvent(map, selectedId);

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
  // The globe leaves the canvas transparent around it, showing the space below.
  return (
    <div className="absolute inset-0 bg-[#05070d] bg-[radial-gradient(ellipse_at_center,#0d1626_0%,#05070d_70%)]">
      <div ref={containerRef} className="size-full" />
    </div>
  );
}
