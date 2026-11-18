import type { HazardSeverity } from "@hazardwatch/db/constants";

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
