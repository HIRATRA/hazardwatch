import { hazardKinds, type HazardKind } from "@hazardwatch/db/constants";

import { hazardKindNouns } from "@/lib/events/format";

import { LiveSentence } from "./live-sentence";

interface LiveSummaryProps {
  /** Events active in the past 24 hours, by kind. */
  counts: Partial<Record<HazardKind, number>>;
}

/** One sentence telling what the past day looked like, with real numbers. */
export function LiveSummary({ counts }: LiveSummaryProps) {
  const items = hazardKinds
    .map((kind) => ({ kind, count: counts[kind] ?? 0 }))
    .filter(({ count }) => count > 0)
    .map(({ kind, count }) => ({
      count,
      label: count === 1 ? hazardKindNouns[kind].one : hazardKindNouns[kind].other,
    }));
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="mx-auto max-w-7xl px-6 pt-28 pb-20 md:pt-40 md:pb-28">
      <LiveSentence items={items} />
    </section>
  );
}
