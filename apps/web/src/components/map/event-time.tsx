import { RelativeTime } from "@/components/ui/relative-time";
import type { MapEvent } from "@/lib/events/types";
import { formatPeriod, formatUtc } from "@/lib/time";

type EventTiming = Pick<MapEvent, "occurredAt" | "activeUntil">;

/** Whether the event happened at a single instant, like an earthquake. */
export function isInstantaneous({ occurredAt, activeUntil }: EventTiming): boolean {
  return occurredAt === activeUntil;
}

interface EventTimeProps {
  event: EventTiming;
  /** Reference time, provided by the server to keep renders consistent. */
  now: string;
}

/**
 * When an event happened: a relative time for an instantaneous event, the
 * days it spans for a lasting one. Exact UTC times are available on hover.
 */
export function EventTime({ event, now }: EventTimeProps) {
  if (isInstantaneous(event)) {
    return <RelativeTime date={event.occurredAt} now={now} />;
  }

  const start = new Date(event.occurredAt);
  const end = new Date(event.activeUntil);
  return (
    <span title={`${formatUtc(start)} to ${formatUtc(end)}`}>
      {formatPeriod(start, end, new Date(now))}
    </span>
  );
}
