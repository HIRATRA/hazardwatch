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
