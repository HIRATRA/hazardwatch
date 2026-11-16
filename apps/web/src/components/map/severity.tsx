import { hazardSeverities, type HazardSeverity } from "@hazardwatch/db/constants";

import { hazardSeverityLabels } from "@/lib/events/format";

/**
 * Marker colours and sizes per severity. Plain hex values, because they are
 * used both in CSS and in MapLibre paint expressions.
 */
export const severityStyles: Record<HazardSeverity, { color: string; radius: number }> = {
  minor: { color: "#facc15", radius: 4 },
  moderate: { color: "#fb923c", radius: 6 },
  severe: { color: "#ef4444", radius: 8 },
  extreme: { color: "#e879f9", radius: 11 },
};

interface SeverityDotProps {
  severity: HazardSeverity;
  className?: string;
}

export function SeverityDot({ severity, className = "" }: SeverityDotProps) {
  return (
    <span
      aria-hidden
      className={`inline-block size-2.5 shrink-0 rounded-full ${className}`}
      style={{ backgroundColor: severityStyles[severity].color }}
    />
  );
}

export function SeverityLegend({ className = "" }: { className?: string }) {
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
    </div>
  );
}
