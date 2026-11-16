import type { HazardKind, HazardSeverity, HazardSource } from "@hazardwatch/db/constants";

/** A hazard event as sent to the browser: flat, serialisable and minimal. */
export interface MapEvent {
  id: string;
  source: HazardSource;
  kind: HazardKind;
  severity: HazardSeverity;
  title: string;
  url: string | null;
  /** ISO 8601 timestamp. */
  occurredAt: string;
  longitude: number;
  latitude: number;
}
