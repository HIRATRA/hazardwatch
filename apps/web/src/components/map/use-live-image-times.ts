"use client";

import { useEffect, useState } from "react";

import {
  fetchLatestImageTime,
  geostationaryLayers,
  settledImageTime,
  type LiveImageTimes,
} from "@/lib/imagery";

/** GIBS publishes a geostationary image every ten minutes. */
const REFRESH_INTERVAL_MS = 5 * 60_000;

/**
 * Times of the geostationary images to show, checked at a fixed interval
 * while `enabled`. Checks pause while the tab is hidden and resume when it
 * becomes visible. A time that could not be read keeps its last value.
 */
export function useLiveImageTimes(enabled: boolean): LiveImageTimes {
  const [times, setTimes] = useState<LiveImageTimes>({});

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const controller = new AbortController();

    const refresh = async () => {
      if (document.visibilityState !== "visible") {
        return;
      }
      const latest = await Promise.all(
        geostationaryLayers.map(async (layer) => {
          const time = await fetchLatestImageTime(layer, { signal: controller.signal });
          return [layer.id, time && settledImageTime(time)] as const;
        }),
      );
      if (controller.signal.aborted) {
        return;
      }
      setTimes((previous) => {
        const known = latest.filter(
          (entry): entry is readonly [string, string] =>
            entry[1] !== null && entry[1] !== previous[entry[0]],
        );
        return known.length > 0 ? { ...previous, ...Object.fromEntries(known) } : previous;
      });
    };

    void refresh();
    const timer = window.setInterval(() => void refresh(), REFRESH_INTERVAL_MS);
    const onVisibilityChange = () => void refresh();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [enabled]);

  return times;
}
