"use client";

import { hazardKinds, hazardSeverities } from "@hazardwatch/db/constants";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Select } from "@/components/ui/select";
import {
  parseEventFilters,
  timeWindows,
  toSearchParams,
  type EventFilters,
  type TimeWindow,
} from "@/lib/events/filters";
import { hazardKindLabels, hazardSeverityLabels } from "@/lib/events/format";

const kindOptions = [
  { value: "", label: "All types" },
  ...hazardKinds.map((value) => ({ value, label: hazardKindLabels[value] })),
];

const timeWindowLabels: Record<TimeWindow, string> = {
  "24h": "Past 24 hours",
  "7d": "Past 7 days",
  "30d": "Past 30 days",
};

const timeWindowOptions = timeWindows.map((value) => ({ value, label: timeWindowLabels[value] }));

const severityOptions = hazardSeverities.map((value) => ({
  value,
  label: value === "minor" ? "All" : `${hazardSeverityLabels[value]} and above`,
}));

/**
 * Filters live in the URL, so a filtered view can be shared or bookmarked.
 * Changing one navigates and lets the server render the matching events.
 */
export function MapFilters({ filters }: { filters: EventFilters }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function update(change: Partial<Record<keyof EventFilters, string>>) {
    const next = parseEventFilters({ ...Object.fromEntries(toSearchParams(filters)), ...change });
    const query = toSearchParams(next).toString();
    startTransition(() => {
      router.replace(query ? `/map?${query}` : "/map", { scroll: false });
    });
  }

  return (
    <div
      aria-busy={pending}
      className={`border-border grid grid-cols-2 gap-3 border-b p-4 transition-opacity ${pending ? "opacity-60" : ""}`}
    >
      <div className="col-span-2">
        <Select
          label="Type"
          name="kind"
          value={filters.kind ?? ""}
          options={kindOptions}
          onChange={(event) => update({ kind: event.target.value })}
        />
      </div>
      <Select
        label="Period"
        name="window"
        value={filters.window}
        options={timeWindowOptions}
        onChange={(event) => update({ window: event.target.value })}
      />
      <Select
        label="Severity"
        name="severity"
        value={filters.severity}
        options={severityOptions}
        onChange={(event) => update({ severity: event.target.value })}
      />
    </div>
  );
}
