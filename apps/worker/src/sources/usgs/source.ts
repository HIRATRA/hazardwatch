import { z } from "zod";

import { fetchJson } from "../../http.js";
import type { IngestedEvent, Source } from "../types.js";
import { toIngestedEvent } from "./normalize.js";
import { usgsFeatureSchema, usgsFeedSchema } from "./schema.js";

/** Earthquakes of magnitude 2.5 and above worldwide over the past day. */
export const USGS_FEED_URL =
  "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson";

/** USGS regenerates its summary feeds every minute. */
const DEFAULT_INTERVAL_MS = 60_000;

export interface UsgsSourceOptions {
  feedUrl?: string;
  intervalMs?: number;
  /** Fetch implementation, injectable for tests. */
  fetch?: typeof globalThis.fetch;
}

/**
 * Polls the USGS earthquake summary feed. The feed covers a sliding window
 * of one day, so a worker that was down for a few minutes catches up on its
 * next run, and events revised by USGS are updated in place.
 */
export function createUsgsSource({
  feedUrl = USGS_FEED_URL,
  intervalMs = DEFAULT_INTERVAL_MS,
  fetch,
}: UsgsSourceOptions = {}): Source {
  return {
    id: "usgs",
    intervalMs,

    async fetchEvents({ signal, logger }) {
      const feed = usgsFeedSchema.safeParse(await fetchJson(feedUrl, { signal, fetch }));
      if (!feed.success) {
        throw new Error(`Unexpected USGS feed format:\n${z.prettifyError(feed.error)}`);
      }

      const events: IngestedEvent[] = [];
      for (const candidate of feed.data.features) {
        const feature = usgsFeatureSchema.safeParse(candidate);
        if (!feature.success) {
          logger.warn(
            { featureId: featureIdOf(candidate), issues: z.prettifyError(feature.error) },
            "skipping malformed USGS feature",
          );
          continue;
        }
        // The feed also lists quarry blasts, explosions and other seismic events.
        if (feature.data.properties.type !== "earthquake") {
          continue;
        }
        events.push(toIngestedEvent(feature.data));
      }
      return events;
    },
  };
}

function featureIdOf(candidate: unknown): unknown {
  return typeof candidate === "object" && candidate !== null && "id" in candidate
    ? candidate.id
    : undefined;
}
