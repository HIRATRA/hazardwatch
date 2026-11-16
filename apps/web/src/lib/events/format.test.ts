import { describe, expect, it } from "vitest";

import { formatCoordinates } from "./format";

describe("formatCoordinates", () => {
  it("uses cardinal directions instead of signs", () => {
    expect(formatCoordinates(-15.0306, -76.0259)).toBe("15.03° S, 76.03° W");
    expect(formatCoordinates(37.3664, 136.7444)).toBe("37.37° N, 136.74° E");
  });

  it("treats the equator and the prime meridian as north and east", () => {
    expect(formatCoordinates(0, 0)).toBe("0.00° N, 0.00° E");
  });
});
