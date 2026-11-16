import type { HazardSource, NewHazardEvent } from "@hazardwatch/db";

/** A normalised event produced by a source, ready to be upserted. */
export type IngestedEvent = Omit<NewHazardEvent, "id" | "createdAt" | "updatedAt">;

/** An upstream hazard feed the worker polls on a fixed interval. */
export interface Source {
  readonly id: HazardSource;
  /** How often the feed should be polled, in milliseconds. */
  readonly intervalMs: number;
  /** Fetches the current feed and maps it to normalised events. */
  fetchEvents(signal: AbortSignal): Promise<IngestedEvent[]>;
}
