"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";

import {
  basemapPreviewUrl,
  basemaps,
  goesEastLayer,
  latestCompleteDay,
  type Basemap,
  type LiveImageTimes,
} from "@/lib/imagery";
import { formatPeriod, formatUtcTime } from "@/lib/time";

const labels: Record<Basemap, string> = {
  map: "Map",
  satellite: "Satellite",
  live: "Live clouds",
  night: "Night lights",
};

/** Stands for the vector map: dark land crossed by faint borders. */
const mapPreview: CSSProperties = {
  backgroundColor: "#16191f",
  backgroundImage:
    "linear-gradient(115deg, transparent 46%, #3a4150 47%, transparent 49%), linear-gradient(30deg, transparent 60%, #2b313c 61%, transparent 63%)",
};

interface BasemapPickerProps {
  value: Basemap;
  onChange: (basemap: Basemap) => void;
  /** ISO 8601 reference time, provided by the server. */
  now: string;
  liveTimes: LiveImageTimes;
  className?: string;
}

/** Button opening the list of basemaps, each with a preview and its date. */
export function BasemapPicker({
  value,
  onChange,
  now,
  liveTimes,
  className = "",
}: BasemapPickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }
    const closeOnOutsidePress = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const reference = new Date(now);
  const day = new Date(latestCompleteDay(reference));
  const liveTime = liveTimes[goesEastLayer.id];
  const details: Record<Basemap, string> = {
    map: "Borders, places and roads",
    satellite: `True colour of ${formatPeriod(day, day, reference)}, NOAA-20`,
    live: `${liveTime ? `Image of ${formatUtcTime(new Date(liveTime))}` : "Every 10 minutes"}, Americas and Pacific`,
    night: "City lights in 2016, Black Marble",
  };

  return (
    <div ref={rootRef} className={`flex flex-col items-end gap-2 ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        className="border-border bg-surface/90 hover:bg-surface-raised focus-visible:ring-accent flex h-9 items-center gap-2 rounded-md border px-2.5 text-sm shadow-lg backdrop-blur transition-colors outline-none focus-visible:ring-2"
      >
        <svg aria-hidden viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor">
          <path d="M10 3 2.5 7 10 11l7.5-4L10 3Z" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="m2.5 10.5 7.5 4 7.5-4" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="m2.5 13.5 7.5 4 7.5-4" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
        <span className="sr-only sm:not-sr-only">{labels[value]}</span>
        <span className="sr-only">, choose the basemap</span>
      </button>

      {open && (
        <fieldset
          id={panelId}
          data-lenis-prevent
          className="border-border bg-surface/95 w-72 max-w-[calc(100vw-1.5rem)] rounded-lg border p-1.5 shadow-xl backdrop-blur motion-safe:transition motion-safe:duration-200 motion-safe:starting:-translate-y-1 motion-safe:starting:opacity-0"
        >
          <legend className="sr-only">Basemap</legend>
          {basemaps.map((basemap) => {
            const preview = basemapPreviewUrl(basemap, { now: reference, liveTimes });
            return (
              <label
                key={basemap}
                className="has-checked:bg-surface-raised has-focus-visible:ring-accent hover:bg-surface-raised/60 flex cursor-pointer items-center gap-3 rounded-md p-1.5 transition-colors has-focus-visible:ring-2"
              >
                <input
                  type="radio"
                  name="basemap"
                  value={basemap}
                  checked={basemap === value}
                  onChange={() => onChange(basemap)}
                  className="sr-only"
                />
                <span
                  aria-hidden
                  className="border-border size-11 shrink-0 rounded border bg-cover bg-center"
                  style={preview ? { backgroundImage: `url("${preview}")` } : mapPreview}
                />
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    {labels[basemap]}
                    {basemap === "live" && (
                      <span aria-hidden className="relative flex size-2">
                        <span className="bg-danger absolute inline-flex size-full rounded-full opacity-75 motion-safe:animate-ping" />
                        <span className="bg-danger relative inline-flex size-2 rounded-full" />
                      </span>
                    )}
                  </span>
                  <span className="text-muted block text-xs text-pretty">{details[basemap]}</span>
                </span>
              </label>
            );
          })}
        </fieldset>
      )}
    </div>
  );
}
