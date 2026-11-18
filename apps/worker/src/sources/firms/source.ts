import { fetchLastModified, fetchText } from "../../http.js";
import type { Source } from "../types.js";
import { toFireEvents } from "./aggregate.js";
import { parseDetections, type Detection } from "./parse.js";

/**
 * Fire detections of the past 24 hours by the VIIRS instruments of NOAA-20
 * and NOAA-21, published by NASA FIRMS without an API key. Each is a few
 * megabytes, refreshed every hour or so.
 */
export const FIRMS_FILES = [
  "https://firms.modaps.eosdis.nasa.gov/data/active_fire/noaa-20-viirs-c2/csv/J1_VIIRS_C2_Global_24h.csv",
  "https://firms.modaps.eosdis.nasa.gov/data/active_fire/noaa-21-viirs-c2/csv/J2_VIIRS_C2_Global_24h.csv",
] as const;

/**
 * Detections reach FIRMS about three hours after a satellite passes over, and
 * the files change about once an hour. Checking every half hour costs two
 * HEAD requests when nothing changed.
 */
const DEFAULT_INTERVAL_MS = 30 * 60_000;

/** The files are large for the free tier of some hosts: allow a slow download. */
const DOWNLOAD_TIMEOUT_MS = 2 * 60_000;

export interface FirmsSourceOptions {
  files?: readonly string[];
  intervalMs?: number;
  /** Fetch implementation, injectable for tests. */
  fetch?: typeof globalThis.fetch;
}

/**
 * Turns NASA FIRMS satellite fire detections into fires, one per cell of a
 * 0.25° grid with enough activity. The files only cover the past 24 hours,
 * so the source is windowed: a fire that goes on keeps its start.
 */
export function createFirmsSource({
  files = FIRMS_FILES,
  intervalMs = DEFAULT_INTERVAL_MS,
  fetch,
}: FirmsSourceOptions = {}): Source {
  // Last-Modified of each file when it was last processed. NASA's server
  // ignores conditional requests, so unchanged files are spotted with HEAD.
  let processedVersions: (string | null)[] = [];

  return {
    id: "nasa_firms",
    intervalMs,
    windowed: true,

    async fetchEvents({ signal, logger }) {
      const versions = await Promise.all(
        files.map((url) => fetchLastModified(url, { signal, fetch })),
      );
      const unchanged =
        versions.every((version) => version !== null) &&
        versions.every((version, index) => version === processedVersions[index]);
      if (unchanged) {
        logger.debug("FIRMS files unchanged since the last run");
        return [];
      }

      const detections: Detection[] = [];
      for (const url of files) {
        const csv = await fetchText(url, { signal, fetch, timeoutMs: DOWNLOAD_TIMEOUT_MS });
        const parsed = parseDetections(csv);
        if (parsed.skipped > 0) {
          logger.warn({ url, skipped: parsed.skipped }, "skipping malformed FIRMS detections");
        }
        detections.push(...parsed.detections);
      }

      const events = toFireEvents(detections);
      logger.info({ detections: detections.length, fires: events.length }, "FIRMS files read");
      processedVersions = versions;
      return events;
    },
  };
}
