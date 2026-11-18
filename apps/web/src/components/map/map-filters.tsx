"use client";

import { hazardKinds, hazardSeverities } from "@hazardwatch/db/constants";
import { SquaresFourIcon } from "@phosphor-icons/react/dist/ssr";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

import { Select } from "@/components/ui/select";
import {
  parseEventFilters,
  timeWindows,
  toSearchParams,
  type EventFilters,
} from "@/lib/events/filters";
import { hazardKindLabels, hazardSeverityLabels, timeWindowLabels } from "@/lib/events/format";

import { hazardKindIcons } from "./hazard-icons";

const timeWindowOptions = timeWindows.map((value) => ({ value, label: timeWindowLabels[value] }));

const severityOptions = hazardSeverities.map((value) => ({
  value,
  label: value === "minor" ? "All" : `${hazardSeverityLabels[value]} and above`,
}));

const kindChips = [
  { value: "", label: "All types", Icon: SquaresFourIcon },
  ...hazardKinds.map((value) => ({
    value,
    label: hazardKindLabels[value],
    Icon: hazardKindIcons[value],
  })),
];

/**
 * Filters live in the URL, so a filtered view can be shared or bookmarked.
 * Changing one navigates and lets the server render the matching events.
 * They apply to the current page, whether the live map or a watch zone.
 */
export function MapFilters({ filters }: { filters: EventFilters }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  function update(change: Partial<Record<keyof EventFilters, string>>) {
    const next = parseEventFilters({ ...Object.fromEntries(toSearchParams(filters)), ...change });
    const query = toSearchParams(next).toString();
    // The current pathname is a valid route by definition.
    const href = (query ? `${pathname}?${query}` : pathname) as Route;
    startTransition(() => {
      router.replace(href, { scroll: false });
    });
  }

  const kind = filters.kind ?? "";

  return (
    <div
      aria-busy={pending}
      className={`flex flex-col gap-4 px-4 pb-4 transition-opacity ${pending ? "opacity-60" : ""}`}
    >
      {/* One scrolling row on phones, where height is scarce, wrapped otherwise. */}
      <div
        role="group"
        aria-label="Type"
        className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {kindChips.map(({ value, label, Icon }) => {
          const active = value === kind;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              onClick={() => update({ kind: value })}
              className="text-muted aria-pressed:border-accent/50 shrink-0 aria-pressed:bg-accent/15 focus-visible:ring-accent inline-flex h-8 items-center gap-1.5 rounded-full border border-white/10 px-3 text-xs font-medium transition-[background-color,border-color,color,transform] outline-none hover:border-white/25 hover:text-neutral-100 focus-visible:ring-2 active:scale-[0.97] aria-pressed:text-neutral-50"
            >
              <Icon aria-hidden className="size-3.5" weight={active ? "fill" : "regular"} />
              {label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Select
          compact
          label="Period"
          name="window"
          value={filters.window}
          options={timeWindowOptions}
          onValueChange={(value) => update({ window: value })}
        />
        <Select
          compact
          label="Severity"
          name="severity"
          value={filters.severity}
          options={severityOptions}
          onValueChange={(value) => update({ severity: value })}
        />
      </div>
    </div>
  );
}
