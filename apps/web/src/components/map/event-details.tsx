"use client";

import { useEffect } from "react";

import {
  formatCoordinates,
  hazardKindLabels,
  hazardSeverityLabels,
  hazardSourceLabels,
} from "@/lib/events/format";
import type { MapEvent } from "@/lib/events/types";

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
      className={`border-border bg-surface/95 w-80 max-w-[calc(100%-1.5rem)] rounded-lg border p-4 shadow-lg backdrop-blur ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 id="event-details-title" className="font-medium text-pretty">
          {event.title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close event details"
          className="text-muted hover:text-neutral-100 focus-visible:ring-accent -mt-1 -mr-1 rounded p-1 outline-none focus-visible:ring-2"
        >
          <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor">
            <path d="M4 4l8 8M12 4l-8 8" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

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
    </article>
  );
}
