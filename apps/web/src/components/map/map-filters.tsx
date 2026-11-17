"use client";

import { hazardKinds, hazardSeverities } from "@hazardwatch/db/constants";
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

const kindOptions = [
  { value: "", label: "All types" },
  ...hazardKinds.map((value) => ({ value, label: hazardKindLabels[value] })),
];

const timeWindowOptions = timeWindows.map((value) => ({ value, label: timeWindowLabels[value] }));

const severityOptions = hazardSeverities.map((value) => ({
  value,
  label: value === "minor" ? "All" : `${hazardSeverityLabels[value]} and above`,
}));

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

  return (
    <div
      aria-busy={pending}
      className={`border-border grid grid-cols-2 gap-3 border-b p-4 transition-opacity ${pending ? "opacity-60" : ""}`}
    >
      <div className="col-span-2">
        <Select
          compact
          label="Type"
          name="kind"
          value={filters.kind ?? ""}
          options={kindOptions}
          onChange={(event) => update({ kind: event.target.value })}
        />
      </div>
      <Select
        compact
        label="Period"
        name="window"
        value={filters.window}
        options={timeWindowOptions}
        onChange={(event) => update({ window: event.target.value })}
      />
      <Select
        compact
        label="Severity"
        name="severity"
        value={filters.severity}
        options={severityOptions}
        onChange={(event) => update({ severity: event.target.value })}
      />
    </div>
  );
}
