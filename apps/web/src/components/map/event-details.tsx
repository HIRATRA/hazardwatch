"use client";

import { useEffect } from "react";

import {
  formatCoordinates,
  hazardKindLabels,
  hazardSeverityLabels,
  hazardSourceLabels,
} from "@/lib/events/format";
import type { MapEvent } from "@/lib/events/types";

import { EventSnapshot } from "./event-snapshot";
import { EventTime, isInstantaneous } from "./event-time";
import { SeverityDot } from "./severity";

interface EventDetailsProps {
  event: MapEvent;
  /** Reference time for relative timestamps. */
  now: string;
  onClose: () => void;
  className?: string;
}

export function EventDetails({ event, now, onClose, className = "" }: EventDetailsProps) {
  useEffect(() => {
    function closeOnEscape(keyboardEvent: KeyboardEvent) {
      if (keyboardEvent.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <article
      aria-labelledby="event-details-title"
      className={`border-border bg-surface/95 relative max-h-[calc(100%-1.5rem)] w-80 max-w-[calc(100%-1.5rem)] overflow-y-auto rounded-lg border pb-4 shadow-lg backdrop-blur ${className}`}
    >
      {/* A new picture for each event, starting from its own day. */}
      <EventSnapshot key={event.id} event={event} now={now} />
      <button
        type="button"
        onClick={onClose}
        aria-label="Close event details"
        className="focus-visible:ring-accent absolute top-2 right-2 rounded-full bg-black/45 p-1.5 text-neutral-100 backdrop-blur transition-colors outline-none hover:bg-black/65 focus-visible:ring-2"
      >
        <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor">
          <path d="M4 4l8 8M12 4l-8 8" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      <div className="px-4 pt-4">
        <h2 id="event-details-title" className="font-medium text-pretty">
          {event.title}
        </h2>

        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          <dt className="text-muted">Severity</dt>
          <dd className="flex items-center gap-2">
            <SeverityDot severity={event.severity} />
            {hazardSeverityLabels[event.severity]}
          </dd>
          <dt className="text-muted">{isInstantaneous(event) ? "Occurred" : "Active"}</dt>
          <dd>
            <EventTime event={event} now={now} />
          </dd>
          <dt className="text-muted">Type</dt>
          <dd>{hazardKindLabels[event.kind]}</dd>
          <dt className="text-muted">Location</dt>
          <dd className="font-mono text-xs leading-5">
            {formatCoordinates(event.latitude, event.longitude)}
          </dd>
        </dl>

        {event.url && (
          <a
            href={event.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent mt-4 inline-block text-sm hover:underline"
          >
            View on {hazardSourceLabels[event.source]}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        )}
      </div>
    </article>
  );
}
