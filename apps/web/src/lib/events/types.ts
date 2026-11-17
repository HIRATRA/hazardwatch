import type { HazardKind, HazardSeverity, HazardSource } from "@hazardwatch/db/constants";

/** A hazard event as sent to the browser: flat, serialisable and minimal. */
export interface MapEvent {
  id: string;
  source: HazardSource;
  kind: HazardKind;
  severity: HazardSeverity;
  title: string;
  url: string | null;
  /** ISO 8601 time at which the event started. */
  occurredAt: string;
  /**
   * ISO 8601 end of the period during which the event is active. Equal to
   * `occurredAt` for instantaneous events such as earthquakes.
   */
  activeUntil: string;
  longitude: number;
  latitude: number;
}
