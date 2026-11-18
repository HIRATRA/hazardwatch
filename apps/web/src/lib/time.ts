const relativeTimeFormat = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

const units: readonly (readonly [Intl.RelativeTimeFormatUnit, number])[] = [
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
];

/** Describes `date` relative to `now`: "3 hours ago", "yesterday", "just now". */
export function formatRelativeTime(date: Date, now: Date): string {
  const seconds = (date.getTime() - now.getTime()) / 1000;
  for (const [unit, secondsPerUnit] of units) {
    if (Math.abs(seconds) >= secondsPerUnit) {
      return relativeTimeFormat.format(Math.trunc(seconds / secondsPerUnit), unit);
    }
  }
  return "just now";
}

const utcFormat = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

/** Absolute time in UTC, rendered identically on the server and in the browser. */
export function formatUtc(date: Date): string {
  return `${utcFormat.format(date)} UTC`;
}

const utcTimeFormat = new Intl.DateTimeFormat("en", { timeStyle: "short", timeZone: "UTC" });

/** Time of day in UTC: "4:16 PM UTC". */
export function formatUtcTime(date: Date): string {
  return `${utcTimeFormat.format(date)} UTC`;
}

const dayFormat = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

const dayWithYearFormat = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

/**
 * Describes a period by its days in UTC: "Oct 24 – Nov 18", or a single day.
 * Years are shown only when the period does not fall entirely within the
 * current year.
 *
 * Both ends are formatted separately: `formatRange` spaces the dash
 * differently in Node.js and in browsers, which would break hydration.
 */
export function formatPeriod(start: Date, end: Date, now: Date): string {
  const year = now.getUTCFullYear();
  const format =
    start.getUTCFullYear() === year && end.getUTCFullYear() === year
      ? dayFormat
      : dayWithYearFormat;
  const from = format.format(start);
  const to = format.format(end);
  return from === to ? from : `${from} – ${to}`;
}
