"use client";

import { useEffect, useRef } from "react";

import { hazardSeverityLabels } from "@/lib/events/format";
import type { MapEvent } from "@/lib/events/types";

import { EventTime } from "./event-time";
import { SeverityDot } from "./severity";

const countFormat = new Intl.NumberFormat("en");

interface EventListProps {
  events: readonly MapEvent[];
  truncated: boolean;
  /** Reference time for relative timestamps. */
  now: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function EventList({ events, truncated, now, selectedId, onSelect }: EventListProps) {
  const selectedRef = useRef<HTMLButtonElement>(null);

  // Keep the selection visible when it is picked on the map.
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: "nearest" });
  }, [selectedId]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <p className="text-muted px-4 py-2 text-xs" aria-live="polite">
        {countFormat.format(events.length)} {events.length === 1 ? "event" : "events"}
        {truncated && ", most recently active shown"}
      </p>

      {events.length === 0 ? (
        <p className="text-muted px-4 py-6 text-sm">No events match these filters.</p>
      ) : (
        <ol className="min-h-0 flex-1 overflow-y-auto">
          {events.map((event) => {
            const selected = event.id === selectedId;
            return (
              <li key={event.id}>
                <button
                  type="button"
                  ref={selected ? selectedRef : undefined}
                  aria-pressed={selected}
                  onClick={() => onSelect(event.id)}
                  className="hover:bg-surface-raised aria-pressed:bg-surface-raised focus-visible:ring-accent flex w-full items-start gap-3 px-4 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset"
                >
                  <SeverityDot severity={event.severity} className="mt-1.5" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{event.title}</span>
                    <span className="text-muted text-xs">
                      <EventTime event={event} now={now} /> · {hazardSeverityLabels[event.severity]}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
