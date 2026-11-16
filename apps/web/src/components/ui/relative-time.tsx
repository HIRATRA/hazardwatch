import { formatRelativeTime, formatUtc } from "@/lib/time";

interface RelativeTimeProps {
  /** ISO 8601 timestamp to describe. */
  date: string;
  /** ISO 8601 reference time, provided by the server to keep renders consistent. */
  now: string;
}

/** Relative time with the exact UTC time available on hover. */
export function RelativeTime({ date, now }: RelativeTimeProps) {
  const value = new Date(date);
  return (
    <time dateTime={date} title={formatUtc(value)}>
      {formatRelativeTime(value, new Date(now))}
    </time>
  );
}
