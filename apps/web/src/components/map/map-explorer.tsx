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

const countFormat = new Intl.NumberFormat("en");

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
    // The page itself does not scroll: the list scrolls natively and the wheel zooms the map.
    <div data-lenis-prevent className="flex min-h-0 flex-1 flex-col md:flex-row">
      <aside
        aria-label="Events"
        className="border-border order-2 flex h-[50dvh] min-h-0 flex-col border-t md:order-1 md:h-auto md:w-[25rem] md:border-t-0 md:border-r"
      >
        <div className="flex items-baseline justify-between gap-3 px-4 pt-4 pb-3">
          <h2 className="flex items-center gap-2 text-sm font-medium">
            <span aria-hidden className="relative flex size-2 self-center">
              <span className="bg-accent absolute inline-flex size-full rounded-full opacity-60 motion-safe:animate-ping" />
              <span className="bg-accent relative inline-flex size-2 rounded-full" />
            </span>
            {zone ? "Events in this zone" : "Live events"}
          </h2>
          <p className="text-muted text-xs tabular-nums" aria-live="polite">
            {countFormat.format(events.length)} {events.length === 1 ? "event" : "events"}
            {truncated && ", latest shown"}
          </p>
        </div>
        <MapFilters filters={filters} />
        <div aria-hidden className="border-border mx-4 mb-2 border-t" />
        <EventList
          events={events}
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
