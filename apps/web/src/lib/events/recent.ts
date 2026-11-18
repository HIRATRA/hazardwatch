import "server-only";

import { listEvents } from "./queries";
import type { MapEvent } from "./types";

/**
 * Events active in the past day, for pages that show what is going on now.
 * Returns none when the database cannot be reached, so that those pages
 * still render without live data.
 */
export async function loadRecentEvents(now: Date): Promise<MapEvent[]> {
  try {
    const { events } = await listEvents({ kind: null, window: "24h", severity: "minor" }, { now });
    return events;
  } catch (error) {
    console.error("Could not load recent events", error);
    return [];
  }
}
