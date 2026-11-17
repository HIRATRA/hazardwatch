import { describe, expect, it } from "vitest";

import { describeZoneArea, formatRadius } from "./format";

describe("formatRadius", () => {
  it("groups thousands", () => {
    expect(formatRadius(25)).toBe("25 km");
    expect(formatRadius(1000)).toBe("1,000 km");
  });
});

describe("describeZoneArea", () => {
  it("gives the radius and the centre", () => {
    expect(describeZoneArea({ longitude: -9.1393, latitude: 38.7223, radiusKm: 100 })).toBe(
      "Within 100 km of 38.72° N, 9.14° W",
    );
  });
});
