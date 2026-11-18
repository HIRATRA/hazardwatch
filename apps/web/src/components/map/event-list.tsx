"use client";

import { FunnelSimpleIcon } from "@phosphor-icons/react/dist/ssr";
import { useEffect, useRef, type CSSProperties } from "react";

import { isRecent } from "@/lib/events/geojson";
import { hazardSeverityLabels } from "@/lib/events/format";
import type { MapEvent } from "@/lib/events/types";

import { EventTime } from "./event-time";
import { hazardKindIcons } from "./hazard-icons";
import { severityStyles } from "./severity";

/** Only the first rows of a list glide in, so that long lists appear at once. */
const ANIMATED_ROWS = 24;

interface EventListProps {
  events: readonly MapEvent[];
  /** Reference time for relative timestamps and recent events. */
  now: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function EventList({ events, now, selectedId, onSelect }: EventListProps) {
  const selectedRef = useRef<HTMLButtonElement>(null);
  const reference = new Date(now);

  // Keep the selection visible when it is picked on the map.
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: "nearest" });
  }, [selectedId]);

  if (events.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 py-12 text-center">
        <span className="grid size-11 place-items-center rounded-full border border-white/10 bg-white/[0.03]">
          <FunnelSimpleIcon aria-hidden className="text-muted size-5" />
        </span>
        <p className="text-sm text-neutral-200">No events match these filters.</p>
        <p className="text-muted text-xs">Try a longer period or a lower severity.</p>
      </div>
    );
  }

  return (
    <ol className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-3">
      {events.map((event, index) => {
        const selected = event.id === selectedId;
        const recent = isRecent(event, reference);
        const { color } = severityStyles[event.severity];
        const Icon = hazardKindIcons[event.kind];
        return (
          <li
            key={event.id}
            className={index < ANIMATED_ROWS ? "list-in" : undefined}
            style={{ "--index": index } as CSSProperties}
          >
            <button
              type="button"
              ref={selected ? selectedRef : undefined}
              aria-pressed={selected}
              onClick={() => onSelect(event.id)}
              className="group focus-visible:ring-accent relative flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors outline-none hover:bg-white/[0.04] focus-visible:ring-2 focus-visible:ring-inset aria-pressed:bg-white/[0.07]"
            >
              {/* The selected event is marked by a bar along its left edge. */}
              <span
                aria-hidden
                className="bg-accent absolute inset-y-2.5 left-0 w-0.5 scale-y-0 rounded-full transition-transform duration-300 group-aria-pressed:scale-y-100"
              />
              <span
                aria-hidden
                className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full"
                style={{
                  color,
                  backgroundColor: `color-mix(in oklch, ${color} 14%, transparent)`,
                  boxShadow: `inset 0 0 0 1px color-mix(in oklch, ${color} 30%, transparent)`,
                }}
              >
                <Icon className="size-4" weight="duotone" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 text-sm leading-snug text-neutral-100">
                  {event.title}
                </span>
                <span className="text-muted mt-1 flex items-center gap-1.5 text-xs">
                  <EventTime event={event} now={now} />
                  <span aria-hidden className="size-0.5 rounded-full bg-current" />
                  {hazardSeverityLabels[event.severity]}
                </span>
              </span>
              {recent && (
                <span className="bg-accent/15 text-accent mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase">
                  New
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
