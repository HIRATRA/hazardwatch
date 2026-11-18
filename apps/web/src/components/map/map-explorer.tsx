"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";

import type { EventFilters } from "@/lib/events/filters";
import type { EventsResult } from "@/lib/events/queries";
import { basemapImagery } from "@/lib/imagery";
import type { ZoneShape } from "@/lib/zones/types";

import { BasemapPicker } from "./basemap-picker";
import { EventDetails } from "./event-details";
import { EventList } from "./event-list";
import { MapFilters } from "./map-filters";
import { MapLegend } from "./map-legend";
import { useAutoRefresh } from "./use-auto-refresh";
import { useBasemap } from "./use-basemap";
import { useLiveImageTimes } from "./use-live-image-times";

/** The workers poll their feeds every minute, so refreshing faster brings nothing. */
const REFRESH_INTERVAL_MS = 60_000;

// WebGL only exists in the browser, and loading MapLibre separately keeps it
// out of the initial JavaScript bundle.
const HazardMap = dynamic(() => import("./hazard-map").then((module) => module.HazardMap), {
  ssr: false,
  loading: () => <div className="bg-surface-raised absolute inset-0 animate-pulse" />,
});

interface MapExplorerProps extends EventsResult {
  filters: EventFilters;
  /** Watch zone the events were selected from, outlined on the map. */
  zone?: ZoneShape;
  /** Event to select when the page opens, such as the one an alert is about. */
  initialSelectedId?: string | null;
}

/** Event list, filters and map, kept in sync through the selected event. */
export function MapExplorer({
  events,
  truncated,
  generatedAt,
  filters,
  zone,
  initialSelectedId = null,
}: MapExplorerProps) {
  const [selectedId, setSelectedId] = useState(initialSelectedId);
  const clearSelection = useCallback(() => setSelectedId(null), []);
  useAutoRefresh(REFRESH_INTERVAL_MS);

  const [basemap, setBasemap] = useBasemap();
  const liveTimes = useLiveImageTimes(basemap === "live");
  const imagery = useMemo(
    () => basemapImagery(basemap, { now: new Date(generatedAt), liveTimes }),
    [basemap, generatedAt, liveTimes],
  );

  // The selection is dropped implicitly when a refresh or a filter removes the event.
  const selectedEvent = events.find((event) => event.id === selectedId) ?? null;
  const activeId = selectedEvent?.id ?? null;

  return (
    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      <aside
        aria-label="Events"
        className="border-border order-2 flex h-[45dvh] min-h-0 flex-col border-t md:order-1 md:h-auto md:w-96 md:border-t-0 md:border-r"
      >
        <MapFilters filters={filters} />
        <EventList
          events={events}
          truncated={truncated}
          now={generatedAt}
          selectedId={activeId}
          onSelect={setSelectedId}
        />
      </aside>

      <section aria-label="Map" className="relative order-1 min-h-0 flex-1 md:order-2">
        <HazardMap
          events={events}
          now={generatedAt}
          selectedId={activeId}
          onSelect={setSelectedId}
          zone={zone}
          imagery={imagery}
        />
        <BasemapPicker
          value={basemap}
          onChange={setBasemap}
          now={generatedAt}
          liveTimes={liveTimes}
          className="absolute top-3 right-3 z-10"
        />
        <MapLegend className="absolute bottom-3 left-3 hidden sm:block" />
        {selectedEvent && (
          <EventDetails
            event={selectedEvent}
            now={generatedAt}
            onClose={clearSelection}
            className="absolute top-3 left-3"
          />
        )}
      </section>
    </div>
  );
}
