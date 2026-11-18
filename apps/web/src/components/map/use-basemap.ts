"use client";

import { useCallback, useSyncExternalStore } from "react";

import { DEFAULT_BASEMAP, isBasemap, type Basemap } from "@/lib/imagery";

const STORAGE_KEY = "hazardwatch.basemap";

const listeners = new Set<() => void>();

/** Basemap chosen in this tab, read once from the browser's storage. */
let current: Basemap | undefined;

function readStored(): Basemap {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isBasemap(stored) ? stored : DEFAULT_BASEMAP;
  } catch {
    // Storage can be disabled or blocked; the choice then lasts for the visit.
    return DEFAULT_BASEMAP;
  }
}

function getSnapshot(): Basemap {
  current ??= readStored();
  return current;
}

const getServerSnapshot = () => DEFAULT_BASEMAP;

function subscribe(listener: () => void) {
  // Follows the choice made in another tab.
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY && isBasemap(event.newValue)) {
      current = event.newValue;
      listener();
    }
  };
  listeners.add(listener);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * Basemap the viewer last chose, remembered by their browser. The server
 * renders the default one, and the stored choice applies once hydrated.
 */
export function useBasemap(): [Basemap, (basemap: Basemap) => void] {
  const basemap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setBasemap = useCallback((next: Basemap) => {
    current = next;
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Remembered for this visit only.
    }
    for (const listener of listeners) {
      listener();
    }
  }, []);

  return [basemap, setBasemap];
}
