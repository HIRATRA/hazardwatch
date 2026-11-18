import type { HazardKind } from "@hazardwatch/db/constants";

import type { MapEvent } from "./types";

/** Number of events of each kind, leaving out kinds without any. */
export function countByKind(
  events: readonly Pick<MapEvent, "kind">[],
): Partial<Record<HazardKind, number>> {
  const counts: Partial<Record<HazardKind, number>> = {};
  for (const event of events) {
    counts[event.kind] = (counts[event.kind] ?? 0) + 1;
  }
  return counts;
}
