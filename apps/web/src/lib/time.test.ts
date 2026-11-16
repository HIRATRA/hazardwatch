import { describe, expect, it } from "vitest";

import { formatRelativeTime, formatUtc } from "./time";

const now = new Date("2026-11-16T12:00:00Z");
const ago = (seconds: number) => new Date(now.getTime() - seconds * 1000);

describe("formatRelativeTime", () => {
  it.each([
    { seconds: 20, expected: "just now" },
    { seconds: 90, expected: "1 minute ago" },
    { seconds: 59 * 60, expected: "59 minutes ago" },
    { seconds: 2.7 * 3600, expected: "2 hours ago" },
    { seconds: 26 * 3600, expected: "yesterday" },
    { seconds: 3 * 86_400, expected: "3 days ago" },
  ])("describes $seconds seconds ago as “$expected”", ({ seconds, expected }) => {
    expect(formatRelativeTime(ago(seconds), now)).toBe(expected);
  });
});

describe("formatUtc", () => {
  it("formats the date in UTC regardless of the local time zone", () => {
    expect(formatUtc(new Date("2026-11-16T16:16:45Z"))).toBe("Nov 16, 2026, 4:16 PM UTC");
  });
});
