import { hazardKinds, type HazardKind } from "@hazardwatch/db/constants";
import { Fragment } from "react";

const nouns: Record<HazardKind, { one: string; other: string }> = {
  earthquake: { one: "earthquake", other: "earthquakes" },
  wildfire: { one: "wildfire", other: "wildfires" },
  tropical_cyclone: { one: "tropical cyclone", other: "tropical cyclones" },
  flood: { one: "flood", other: "floods" },
  volcano: { one: "volcano", other: "volcanoes" },
  drought: { one: "drought", other: "droughts" },
};

const numberFormat = new Intl.NumberFormat("en");

interface LiveSummaryProps {
  /** Events active in the past 24 hours, by kind. */
  counts: Partial<Record<HazardKind, number>>;
}

/** One sentence telling what the past day looked like, with real numbers. */
export function LiveSummary({ counts }: LiveSummaryProps) {
  const items = hazardKinds
    .map((kind) => ({ kind, count: counts[kind] ?? 0 }))
    .filter(({ count }) => count > 0);
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="mx-auto max-w-7xl px-6 pt-28 pb-20 md:pt-40 md:pb-28">
      <p className="reveal max-w-5xl text-3xl leading-[1.25] font-light tracking-tight text-pretty text-neutral-400 md:text-5xl">
        In the past 24 hours, HazardWatch followed{" "}
        {items.map(({ kind, count }, index) => (
          <Fragment key={kind}>
            {index > 0 && (index === items.length - 1 ? " and " : ", ")}
            <span className="whitespace-nowrap text-neutral-50">
              <span className="font-normal tabular-nums">{numberFormat.format(count)}</span>{" "}
              {count === 1 ? nouns[kind].one : nouns[kind].other}
            </span>
          </Fragment>
        ))}
        .
      </p>
    </section>
  );
}
