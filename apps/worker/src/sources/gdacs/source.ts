import { z } from "zod";

import { fetchJson, HttpError } from "../../http.js";
import type { IngestedEvent, Source } from "../types.js";
import { formatGdacsDate, gdacsExternalId, toIngestedEvent } from "./normalize.js";
import {
  gdacsAlertLevels,
  gdacsEventTypes,
  gdacsFeatureSchema,
  gdacsPageSchema,
} from "./schema.js";

/** Events modified since a given date, most recently active first. */
export const GDACS_EVENTS_URL = "https://www.gdacs.org/gdacsapi/api/events/geteventlist/latest";

/** Largest page the API serves. */
export const GDACS_PAGE_SIZE = 100;

/** GDACS reassesses events every few hours at most, so polling faster brings nothing. */
const DEFAULT_INTERVAL_MS = 10 * 60_000;

/** How far back modifications are fetched, which is also the longest outage the worker recovers from. */
const DEFAULT_LOOKBACK_MS = 2 * 24 * 60 * 60_000;

/** Bound on requests per run, in case the API ever ignores paging. */
const DEFAULT_MAX_PAGES = 20;

export interface GdacsSourceOptions {
  eventsUrl?: string;
  intervalMs?: number;
  lookbackMs?: number;
  maxPages?: number;
  /** Fetch implementation, injectable for tests. */
  fetch?: typeof globalThis.fetch;
  /** Clock, injectable for tests. */
  now?: () => Date;
}

/**
 * Polls the GDACS event list for tropical cyclones, floods, volcanoes,
 * droughts and wildfires. Each run requests every event modified during the
 * lookback period, page by page, so events revised by GDACS are updated in
 * place and a short outage is caught up on the next run.
 */
export function createGdacsSource({
  eventsUrl = GDACS_EVENTS_URL,
  intervalMs = DEFAULT_INTERVAL_MS,
  lookbackMs = DEFAULT_LOOKBACK_MS,
  maxPages = DEFAULT_MAX_PAGES,
  fetch,
  now = () => new Date(),
}: GdacsSourceOptions = {}): Source {
  return {
    id: "gdacs",
    intervalMs,

    async fetchEvents({ signal, logger }) {
      const modifiedSince = formatGdacsDate(new Date(now().getTime() - lookbackMs));
      // Keyed by event: the list can shift between two page requests, and an
      // upsert must not touch the same row twice.
      const events = new Map<string, IngestedEvent>();

      for (let page = 1; page <= maxPages; page++) {
        const url = pageUrl(eventsUrl, modifiedSince, page);
        const features = await fetchPage(url, signal, fetch);

        for (const candidate of features) {
          const feature = gdacsFeatureSchema.safeParse(candidate);
          if (!feature.success) {
            logger.warn(
              { eventKey: eventKeyOf(candidate), issues: z.prettifyError(feature.error) },
              "skipping malformed GDACS event",
            );
            continue;
          }
          keepLatest(events, toIngestedEvent(feature.data));
        }

        if (features.length < GDACS_PAGE_SIZE) {
          return [...events.values()];
        }
      }

      logger.warn({ maxPages }, "stopped paging through GDACS events, some may be missing");
      return [...events.values()];
    },
  };
}

function pageUrl(eventsUrl: string, modifiedSince: string, page: number): string {
  const query = new URLSearchParams({
    eventlist: gdacsEventTypes.join(";"),
    alertlevel: gdacsAlertLevels.join(";"),
    datemodified: modifiedSince,
    pageSize: String(GDACS_PAGE_SIZE),
    pageNumber: String(page),
  });
  return `${eventsUrl}?${query.toString()}`;
}

async function fetchPage(
  url: string,
  signal: AbortSignal,
  fetch: typeof globalThis.fetch | undefined,
): Promise<unknown[]> {
  let body: unknown;
  try {
    body = await fetchJson(url, { signal, fetch });
  } catch (error) {
    // GDACS answers 404 when no event matches, including past the last page.
    if (error instanceof HttpError && error.status === 404) {
      return [];
    }
    throw error;
  }

  const page = gdacsPageSchema.safeParse(body);
  if (!page.success) {
    throw new Error(`Unexpected GDACS event list format:\n${z.prettifyError(page.error)}`);
  }
  return page.data.features;
}

function keepLatest(events: Map<string, IngestedEvent>, event: IngestedEvent): void {
  const known = events.get(event.externalId);
  if (
    known?.sourceUpdatedAt &&
    event.sourceUpdatedAt &&
    known.sourceUpdatedAt > event.sourceUpdatedAt
  ) {
    return;
  }
  events.set(event.externalId, event);
}

function eventKeyOf(candidate: unknown): string | undefined {
  const parsed = z
    .object({
      properties: z.object({
        eventtype: z.string(),
        eventid: z.number(),
      }),
    })
    .safeParse(candidate);
  if (!parsed.success) {
    return undefined;
  }
  return gdacsExternalId(parsed.data.properties.eventtype, parsed.data.properties.eventid);
}
