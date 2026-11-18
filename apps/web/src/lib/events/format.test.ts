import { describe, expect, it } from "vitest";

import { formatCoordinates, formatEventCounts } from "./format";

describe("formatCoordinates", () => {
  it("uses cardinal directions instead of signs", () => {
    expect(formatCoordinates(-15.0306, -76.0259)).toBe("15.03° S, 76.03° W");
    expect(formatCoordinates(37.3664, 136.7444)).toBe("37.37° N, 136.74° E");
  });

  it("treats the equator and the prime meridian as north and east", () => {
    expect(formatCoordinates(0, 0)).toBe("0.00° N, 0.00° E");
  });
});

describe("formatEventCounts", () => {
  it("lists counts in the order of hazard kinds, with an and before the last", () => {
    expect(formatEventCounts({ flood: 2, earthquake: 43, wildfire: 1_403 })).toBe(
      "43 earthquakes, 1,403 wildfires and 2 floods",
    );
  });

  it("agrees each noun with its count", () => {
    expect(formatEventCounts({ tropical_cyclone: 1, volcano: 3 })).toBe(
      "1 tropical cyclone and 3 volcanoes",
    );
    expect(formatEventCounts({ drought: 1 })).toBe("1 drought");
  });

  it("returns null when there is nothing to count", () => {
    expect(formatEventCounts({})).toBeNull();
    expect(formatEventCounts({ flood: 0 })).toBeNull();
  });
});
