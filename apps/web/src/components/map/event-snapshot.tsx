"use client";

import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import { useMemo, useState } from "react";

import {
  shiftDay,
  snapshotDays,
  snapshotFrame,
  snapshotUrl,
  SNAPSHOT_HEIGHT,
  SNAPSHOT_WIDTH,
} from "@/lib/events/snapshot";
import type { MapEvent } from "@/lib/events/types";
import { formatPeriod } from "@/lib/time";

import { severityStyles } from "./severity";

/** Days skipped back on their own when the first picture is empty. */
const MAX_AUTOMATIC_STEPS = 3;

type Status = "loaded" | "empty" | "failed";

/**
 * Whether a picture is mostly black, as GIBS returns where the satellite
 * missed a place or saw it in the dark. Reads a few pixels, which GIBS
 * allows from any website.
 */
function isMostlyEmpty(image: HTMLImageElement): boolean {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 20;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    return false;
  }
  try {
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    let black = 0;
    for (let index = 0; index < data.length; index += 4) {
      if (data[index]! + data[index + 1]! + data[index + 2]! < 15) {
        black++;
      }
    }
    return black / (canvas.width * canvas.height) > 0.6;
  } catch {
    // A picture the page may not read: assume it shows something.
    return false;
  }
}

interface EventSnapshotProps {
  event: MapEvent;
  /** ISO 8601 reference time, provided by the server. */
  now: string;
}

/**
 * The area around an event seen from orbit by NOAA-20, in true colour with
 * fires in red, on the last day of activity. Arrows go back and forth in
 * days, and empty pictures, where the satellite missed the place, give way
 * to the day before on their own.
 */
export function EventSnapshot({ event, now }: EventSnapshotProps) {
  const reference = useMemo(() => new Date(now), [now]);
  const days = useMemo(() => snapshotDays(event, reference), [event, reference]);
  const frame = useMemo(() => snapshotFrame(event), [event]);

  const [day, setDay] = useState(days.initial);
  const [automaticSteps, setAutomaticSteps] = useState(0);
  const [browsed, setBrowsed] = useState(false);
  const [result, setResult] = useState<{ src: string; status: Status } | null>(null);

  const src = snapshotUrl(frame, day);
  const status = result?.src === src ? result.status : "loading";
  const dayLabel = formatPeriod(new Date(day), new Date(day), reference);

  function handleLoad(image: HTMLImageElement) {
    const empty = isMostlyEmpty(image);
    if (empty && !browsed && automaticSteps < MAX_AUTOMATIC_STEPS && day > days.first) {
      setAutomaticSteps(automaticSteps + 1);
      setDay(shiftDay(day, -1));
      return;
    }
    setResult({ src, status: empty ? "empty" : "loaded" });
  }

  function browse(step: number) {
    setBrowsed(true);
    setDay(shiftDay(day, step));
  }

  return (
    <figure>
      <div className="relative aspect-[8/5] overflow-hidden bg-white/[0.03]">
        {status === "loading" && (
          <div aria-hidden className="absolute inset-0 animate-pulse bg-white/[0.05]" />
        )}
        <Image
          key={src}
          src={src}
          alt={`The area around this event seen from orbit on ${dayLabel}`}
          width={SNAPSHOT_WIDTH}
          height={SNAPSHOT_HEIGHT}
          unoptimized
          crossOrigin="anonymous"
          onLoad={(loaded) => handleLoad(loaded.currentTarget)}
          onError={() => setResult({ src, status: "failed" })}
          className={`size-full object-cover transition-opacity duration-500 ${status === "loading" ? "opacity-0" : "opacity-100"}`}
        />
        {status === "loaded" && (
          <span
            aria-hidden
            className="absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow-[0_0_0_2px_rgba(0,0,0,0.35)]"
            style={{
              left: `${frame.marker.x * 100}%`,
              top: `${frame.marker.y * 100}%`,
              borderColor: severityStyles[event.severity].color,
            }}
          />
        )}
        {(status === "empty" || status === "failed") && (
          <p className="text-muted absolute inset-0 grid place-items-center px-6 text-center text-xs">
            {status === "empty"
              ? "The satellite did not picture this place in daylight that day."
              : "The picture could not be loaded."}
          </p>
        )}
      </div>
      <figcaption className="text-muted flex items-center justify-between gap-3 px-4 pt-3 text-xs">
        <span>
          <time dateTime={day}>{dayLabel}</time> from NOAA-20, fires in red
        </span>
        <span className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => browse(-1)}
            disabled={day <= days.first}
            aria-label="Previous day"
            className="focus-visible:ring-accent grid size-7 place-items-center rounded-lg transition-colors outline-none hover:bg-white/[0.07] hover:text-neutral-100 focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-30"
          >
            <CaretLeftIcon aria-hidden className="size-3.5" weight="bold" />
          </button>
          <button
            type="button"
            onClick={() => browse(1)}
            disabled={day >= days.last}
            aria-label="Next day"
            className="focus-visible:ring-accent grid size-7 place-items-center rounded-lg transition-colors outline-none hover:bg-white/[0.07] hover:text-neutral-100 focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-30"
          >
            <CaretRightIcon aria-hidden className="size-3.5" weight="bold" />
          </button>
        </span>
      </figcaption>
    </figure>
  );
}
