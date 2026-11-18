import { describe, expect, it } from "vitest";

import { countByKind } from "./summary";

describe("countByKind", () => {
  it("counts events of each kind present", () => {
    expect(
      countByKind([{ kind: "wildfire" }, { kind: "earthquake" }, { kind: "wildfire" }]),
    ).toEqual({ wildfire: 2, earthquake: 1 });
  });

  it("is empty without events", () => {
    expect(countByKind([])).toEqual({});
  });
});
