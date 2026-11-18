"use client";

import type { Map as MapLibreMap } from "maplibre-gl";
import { useEffect, useRef } from "react";

import { createMap } from "@/components/map/maplibre";
import { ZoomControls } from "@/components/map/zoom-controls";
import { addZoneLayers, setZone } from "@/components/map/zone-layers";
import { roundCoordinate, zoneBounds } from "@/lib/zones/geometry";
import type { ZoneShape } from "@/lib/zones/types";

export interface ZoneCenter {
  longitude: number;
  latitude: number;
}

interface ZonePickerMapProps {
  /** Centre of the zone, or null until one is picked. */
  center: ZoneCenter | null;
  radiusKm: number;
  onPick: (center: ZoneCenter) => void;
}

const FIT_OPTIONS = { padding: 48, maxZoom: 10 };

/** Map that previews a zone and moves its centre wherever the user clicks. */
export function ZonePickerMap({ center, radiusKm, onPick }: ZonePickerMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const zone: ZoneShape | null = center ? { ...center, radiusKm } : null;

  // Latest values for handlers registered once, when the map is created.
  const latest = useRef({ zone, onPick });
  useEffect(() => {
    latest.current = { zone, onPick };
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const initialZone = latest.current.zone;
    const map = createMap(
      container,
      initialZone ? { bounds: zoneBounds(initialZone), fitBoundsOptions: FIT_OPTIONS } : {},
    );
    mapRef.current = map;
    map.getCanvas().style.cursor = "crosshair";

    // Fired before tiles arrive, and again when the style is rebuilt after a
    // lost WebGL context, which drops the layers added here.
    map.on("style.load", () => addZoneLayers(map, latest.current.zone));
    map.on("click", (event) => {
      const { lng, lat } = event.lngLat.wrap();
      latest.current.onPick({ longitude: roundCoordinate(lng), latitude: roundCoordinate(lat) });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Redraw and frame the zone when it moves or changes size, whether from a
  // click on the map or from the form.
  const longitude = center?.longitude;
  const latitude = center?.latitude;
  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    const current =
      longitude === undefined || latitude === undefined ? null : { longitude, latitude, radiusKm };
    setZone(map, current);
    if (current) {
      map.fitBounds(zoneBounds(current), FIT_OPTIONS);
    }
  }, [longitude, latitude, radiusKm]);

  // MapLibre's unlayered stylesheet forces `position: relative` on the map
  // container, which beats Tailwind utilities, so positioning lives on a wrapper.
  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="size-full" />
      <ZoomControls getMap={() => mapRef.current} className="absolute right-3 bottom-10" />
    </div>
  );
}
