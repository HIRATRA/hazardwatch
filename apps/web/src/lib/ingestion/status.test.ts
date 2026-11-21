import { describe, expect, it } from "vitest";

import { feedStatus } from "./status";

const now = new Date("2026-11-21T12:00:00Z");
const minutesAgo = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString();

describe("feedStatus", () => {
  it("is off for a source that never ran", () => {
    expect(feedStatus(undefined, 1, now)).toBe("off");
  });

  it("reports a failed last run, however recent", () => {
    expect(feedStatus({ status: "failed", startedAt: minutesAgo(1) }, 1, now)).toBe("failed");
  });

  it("is ok within three intervals", () => {
    expect(feedStatus({ status: "succeeded", startedAt: minutesAgo(25) }, 10, now)).toBe("ok");
  });

  it("is late after three intervals", () => {
    expect(feedStatus({ status: "succeeded", startedAt: minutesAgo(31) }, 10, now)).toBe("late");
  });

  it("waits at least 15 minutes for frequent feeds", () => {
    expect(feedStatus({ status: "succeeded", startedAt: minutesAgo(10) }, 1, now)).toBe("ok");
    expect(feedStatus({ status: "succeeded", startedAt: minutesAgo(16) }, 1, now)).toBe("late");
  });
});
