import { describe, expect, it } from "vitest";

import {
  defaultEventFilters,
  parseEventFilters,
  severitiesAtLeast,
  toSearchParams,
  windowStart,
} from "./filters";

describe("parseEventFilters", () => {
  it("uses the defaults when no filter is set", () => {
    expect(parseEventFilters({})).toEqual(defaultEventFilters);
  });

  it("reads valid values", () => {
    expect(parseEventFilters({ kind: "flood", window: "30d", severity: "severe" })).toEqual({
      kind: "flood",
      window: "30d",
      severity: "severe",
    });
  });

  it("falls back to the default for each invalid value", () => {
    expect(parseEventFilters({ kind: "meteor", window: "24h", severity: "severe" })).toEqual({
      kind: defaultEventFilters.kind,
      window: "24h",
      severity: "severe",
    });
    expect(parseEventFilters({ kind: "flood", window: "1y", severity: "severe" })).toEqual({
      kind: "flood",
      window: defaultEventFilters.window,
      severity: "severe",
    });
    expect(parseEventFilters({ kind: "flood", window: "24h", severity: "apocalyptic" })).toEqual({
      kind: "flood",
      window: "24h",
      severity: defaultEventFilters.severity,
    });
  });

  it("shows every type of hazard unless one is chosen", () => {
    expect(parseEventFilters({}).kind).toBeNull();
    expect(parseEventFilters({ kind: "" }).kind).toBeNull();
  });

  it("keeps the first value of a repeated parameter", () => {
    expect(parseEventFilters({ window: ["24h", "30d"] }).window).toBe("24h");
  });
});

describe("toSearchParams", () => {
  it("leaves default values out of the URL", () => {
    expect(toSearchParams(defaultEventFilters).toString()).toBe("");
  });

  it("round-trips through parseEventFilters", () => {
    const filters = { kind: "wildfire", window: "24h", severity: "moderate" } as const;
    const params = Object.fromEntries(toSearchParams(filters));

    expect(parseEventFilters(params)).toEqual(filters);
  });
});

describe("severitiesAtLeast", () => {
  it("includes the given level and every level above it", () => {
    expect(severitiesAtLeast("minor")).toEqual(["minor", "moderate", "severe", "extreme"]);
    expect(severitiesAtLeast("severe")).toEqual(["severe", "extreme"]);
  });
});

describe("windowStart", () => {
  it("subtracts the window duration from now", () => {
    const now = new Date("2026-11-16T12:00:00Z");

    expect(windowStart("24h", now)).toEqual(new Date("2026-11-15T12:00:00Z"));
    expect(windowStart("7d", now)).toEqual(new Date("2026-11-09T12:00:00Z"));
  });
});
