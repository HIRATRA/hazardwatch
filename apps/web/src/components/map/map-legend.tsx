import { hazardSeverities } from "@hazardwatch/db/constants";

import { hazardSeverityLabels } from "@/lib/events/format";
import { RECENT_WINDOW_HOURS } from "@/lib/events/geojson";

import { SeverityDot } from "./severity";

/** Explains the colours of the markers, the pulsing rings and the heat of fires. */
export function MapLegend({ className = "" }: { className?: string }) {
  return (
    <div
      className={`border-border bg-surface/90 rounded-md border px-3 py-2 text-xs backdrop-blur ${className}`}
    >
      <p className="text-muted mb-1.5 font-medium">Severity</p>
      <ul className="flex flex-col gap-1">
        {hazardSeverities.map((severity) => (
          <li key={severity} className="flex items-center gap-2">
            <SeverityDot severity={severity} />
            {hazardSeverityLabels[severity]}
          </li>
        ))}
      </ul>
      <ul className="border-border mt-2 flex flex-col gap-1 border-t pt-2">
        <li className="flex items-center gap-2">
          <span aria-hidden className="relative flex size-2.5 items-center justify-center">
            <span className="absolute inline-flex size-full rounded-full border border-neutral-300 motion-safe:animate-ping" />
            <span className="inline-flex size-1.5 rounded-full bg-neutral-300" />
          </span>
          Started in the past {RECENT_WINDOW_HOURS} hours
        </li>
        <li className="flex items-center gap-2">
          <span
            aria-hidden
            className="h-2.5 w-2.5 shrink-0 rounded-full bg-[radial-gradient(circle,#fef08a_0%,#ea580c_45%,transparent_75%)]"
          />
          Fire activity
        </li>
      </ul>
    </div>
  );
}
