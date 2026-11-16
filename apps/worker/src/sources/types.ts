import type { HazardSource, NewHazardEvent } from "@hazardwatch/db";

import type { Logger } from "../logger.js";

/** A normalised event produced by a source, ready to be upserted. */
export type IngestedEvent = Omit<NewHazardEvent, "id" | "createdAt" | "updatedAt">;

/** Runtime context handed to a source for each polling pass. */
export interface FetchContext {
  /** Aborted when the worker shuts down. */
  readonly signal: AbortSignal;
  /** Logger already scoped to the source. */
  readonly logger: Logger;
}

/** An upstream hazard feed the worker polls on a fixed interval. */
export interface Source {
  readonly id: HazardSource;
  /** How often the feed should be polled, in milliseconds. */
  readonly intervalMs: number;
  /** Fetches the current feed and maps it to normalised events. */
  fetchEvents(context: FetchContext): Promise<IngestedEvent[]>;
}
