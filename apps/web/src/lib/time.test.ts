import { describe, expect, it } from "vitest";

import { formatPeriod, formatRelativeTime, formatUtc } from "./time";

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

describe("formatPeriod", () => {
  it.each([
    { start: "2026-11-09T00:00:00Z", end: "2026-11-16T00:00:00Z", expected: "Nov 9 – Nov 16" },
    { start: "2026-10-24T01:00:00Z", end: "2026-11-18T01:00:00Z", expected: "Oct 24 – Nov 18" },
    { start: "2026-11-16T01:00:00Z", end: "2026-11-16T18:00:00Z", expected: "Nov 16" },
    {
      start: "2022-09-21T00:00:00Z",
      end: "2026-11-16T10:56:26Z",
      expected: "Sep 21, 2022 – Nov 16, 2026",
    },
  ])("describes $start to $end as “$expected”", ({ start, end, expected }) => {
    expect(formatPeriod(new Date(start), new Date(end), now)).toBe(expected);
  });

  it("uses UTC days regardless of the local time zone", () => {
    expect(
      formatPeriod(new Date("2026-11-15T23:30:00Z"), new Date("2026-11-16T00:30:00Z"), now),
    ).toBe("Nov 15 – Nov 16");
  });
});
