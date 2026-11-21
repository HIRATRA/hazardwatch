import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";

import { openAlert } from "@/app/alerts/actions";
import { hazardKindIcons } from "@/components/map/hazard-icons";
import { severityStyles } from "@/components/map/severity";
import { RelativeTime } from "@/components/ui/relative-time";
import type { AlertItem } from "@/lib/alerts/queries";
import { hazardKindLabels, hazardSeverityLabels } from "@/lib/events/format";

interface AlertRowProps {
  alert: AlertItem;
  /** ISO 8601 reference time for the relative time. */
  now: string;
  /** Tighter, for the dashboard. */
  compact?: boolean;
}

/**
 * One alert: the kind of hazard in the colour of its severity, the event,
 * the zone it reached and when. Opening it marks it as read, which a plain
 * link could not do safely, so it is a form.
 */
export function AlertRow({ alert, now, compact = false }: AlertRowProps) {
  const Icon = hazardKindIcons[alert.eventKind];
  const color = severityStyles[alert.severity].color;

  return (
    <form action={openAlert.bind(null, alert.id)}>
      <button
        type="submit"
        className={`group focus-visible:ring-accent flex w-full items-center gap-4 rounded-2xl text-left transition-colors outline-none hover:bg-white/[0.04] focus-visible:ring-2 ${
          compact ? "-mx-3 w-[calc(100%+1.5rem)] px-3 py-2.5" : "px-4 py-3.5 md:px-5"
        }`}
      >
        <span
          aria-hidden
          className="relative grid size-10 shrink-0 place-items-center rounded-xl border"
          style={{
            color,
            borderColor: `color-mix(in oklch, ${color} 30%, transparent)`,
            backgroundColor: `color-mix(in oklch, ${color} 10%, transparent)`,
          }}
        >
          <Icon className="size-5" weight={alert.read ? "regular" : "fill"} />
          {!alert.read && (
            <span className="bg-accent ring-ink absolute -top-0.5 -right-0.5 size-2.5 rounded-full ring-2" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={`block truncate text-sm ${alert.read ? "text-neutral-300" : "font-medium text-neutral-50"}`}
          >
            {!alert.read && <span className="sr-only">Unread: </span>}
            {alert.eventTitle}
          </span>
          <span className="text-muted mt-0.5 flex min-w-0 items-center gap-1.5 text-xs">
            <span style={{ color }}>{hazardSeverityLabels[alert.severity]}</span>
            <span className="sr-only">{hazardKindLabels[alert.eventKind]}</span>
            <span aria-hidden>·</span>
            <span className="truncate">{alert.zoneName}</span>
            <span aria-hidden>·</span>
            <span className="shrink-0 font-mono">
              <RelativeTime date={alert.raisedAt} now={now} />
            </span>
          </span>
        </span>
        <ArrowRightIcon
          aria-hidden
          className="text-muted size-4 shrink-0 -translate-x-1 opacity-0 transition-[opacity,transform] group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100"
        />
      </button>
    </form>
  );
}
