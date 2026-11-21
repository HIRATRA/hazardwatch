import { hazardKinds, hazardSeverities, type HazardSource } from "@hazardwatch/db/constants";
import { ArrowRightIcon, PlusIcon } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Link from "next/link";

import { AlertRow } from "@/components/alerts/alert-row";
import { EmailVerificationNotice } from "@/components/auth/email-verification-notice";
import { AppPage, PageIntro, riseDelay } from "@/components/layout/app-page";
import { hazardKindIcons } from "@/components/map/hazard-icons";
import { SeverityDot } from "@/components/map/severity";
import { buttonClassName } from "@/components/ui/button";
import { Panel, PanelLink } from "@/components/ui/panel";
import { RelativeTime } from "@/components/ui/relative-time";
import { countUnreadAlerts, listAlerts } from "@/lib/alerts/queries";
import { hazardKindNouns, hazardSourceLabels } from "@/lib/events/format";
import { loadRecentEvents } from "@/lib/events/recent";
import { countByKind } from "@/lib/events/summary";
import { listLastRuns } from "@/lib/ingestion/queries";
import { feedStatus, type FeedStatus } from "@/lib/ingestion/status";
import { requireSession } from "@/lib/session";
import { describeRecentEvents, describeZoneArea } from "@/lib/zones/format";
import { MAX_ZONES_PER_USER } from "@/lib/zones/input";
import { listZones, RECENT_WINDOW } from "@/lib/zones/queries";
import type { ZoneSummary } from "@/lib/zones/types";

export const metadata: Metadata = { title: "Dashboard" };

const DASHBOARD_ZONES = 5;
const DASHBOARD_ALERTS = 5;

const numberFormat = new Intl.NumberFormat("en");

/** What each source watches and how often the worker asks it. */
const feeds: Record<HazardSource, { covers: string; cadence: string; intervalMinutes: number }> = {
  usgs: { covers: "Earthquakes", cadence: "Every minute", intervalMinutes: 1 },
  nasa_firms: { covers: "Fires seen from orbit", cadence: "Every 30 minutes", intervalMinutes: 30 },
  gdacs: {
    covers: "Cyclones, floods, volcanoes, droughts",
    cadence: "Every 10 minutes",
    intervalMinutes: 10,
  },
};

const feedDotClassNames: Record<FeedStatus, string> = {
  ok: "bg-accent",
  late: "bg-yellow-400",
  failed: "bg-danger",
  off: "bg-white/20",
};

const feedLabels: Record<FeedStatus, string> = {
  ok: "Updated",
  late: "Late, last updated",
  failed: "Failed",
  off: "Not running",
};

/** Zones with the most severe recent events first, then the busiest. */
function byActivity(a: ZoneSummary, b: ZoneSummary): number {
  const rank = (zone: ZoneSummary) =>
    zone.highestSeverity ? hazardSeverities.indexOf(zone.highestSeverity) : -1;
  return rank(b) - rank(a) || b.recentEvents - a.recentEvents;
}

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const { user } = await requireSession();
  // Better Auth sends users back here with an error code, such as
  // TOKEN_EXPIRED, when a confirmation link does not work.
  const { error } = await searchParams;
  const now = new Date();

  const [zones, { alerts, generatedAt }, unread, events, runs] = await Promise.all([
    listZones(user.id, now),
    listAlerts(user.id, { limit: DASHBOARD_ALERTS, now }),
    countUnreadAlerts(user.id),
    loadRecentEvents(now),
    listLastRuns(),
  ]);

  const firstName = user.name.trim().split(/\s+/)[0] || user.name;
  const kinds = countByKind(events);
  const busiestZones = [...zones].sort(byActivity).slice(0, DASHBOARD_ZONES);

  const description =
    zones.length === 0
      ? "Add a place you care about to start getting alerts."
      : unread > 0
        ? `${numberFormat.format(unread)} unread ${unread === 1 ? "alert is" : "alerts are"} waiting for you.`
        : "Nothing new has reached your zones since you last looked.";

  const stats = [
    { label: "Zones watched", value: zones.length, note: `of ${MAX_ZONES_PER_USER}` },
    { label: "Unread alerts", value: unread, note: unread > 0 ? "to review" : "all caught up" },
    { label: "Events worldwide", value: events.length, note: "in the past 24 hours" },
  ];

  return (
    <AppPage>
      <PageIntro
        eyebrow="Dashboard"
        title={`Welcome back, ${firstName}.`}
        description={description}
        actions={
          <Link href="/map" className={buttonClassName("ghost")}>
            Open the live map
            <ArrowRightIcon
              aria-hidden
              className="size-4 transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        }
      />

      {!user.emailVerified && (
        <EmailVerificationNotice
          email={user.email}
          invalidLink={error !== undefined}
          className="rise-in mt-10"
        />
      )}

      <dl className="mt-14 grid gap-x-10 gap-y-8 sm:grid-cols-3">
        {stats.map((stat, index) => (
          <div
            key={stat.label}
            className="rise-in border-t border-white/10 pt-5"
            style={riseDelay(250 + index * 80)}
          >
            <dt className="text-muted text-sm">{stat.label}</dt>
            <dd className="mt-3 flex items-baseline gap-2.5">
              <span className="font-mono text-4xl font-light tracking-tight text-neutral-50 tabular-nums">
                {numberFormat.format(stat.value)}
              </span>
              <span className="text-muted text-sm">{stat.note}</span>
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-14 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Panel
          id="dashboard-zones"
          title="Your zones"
          action={zones.length > 0 && <PanelLink href="/zones">All zones</PanelLink>}
          className="rise-in"
          style={riseDelay(450)}
        >
          {zones.length === 0 ? (
            <div className="flex flex-1 flex-col items-start justify-center gap-5 py-6">
              <p className="text-muted max-w-sm text-sm leading-relaxed">
                Draw a circle around your home, an office or a supplier, and follow the hazards
                inside it.
              </p>
              <Link href="/zones/new" className={buttonClassName()}>
                <PlusIcon aria-hidden weight="bold" className="size-4" />
                Create your first zone
              </Link>
            </div>
          ) : (
            <ul className="-my-1">
              {busiestZones.map((zone) => (
                <li key={zone.id}>
                  <Link
                    href={`/zones/${zone.id}`}
                    className="group focus-visible:ring-accent -mx-3 flex items-center gap-4 rounded-2xl px-3 py-3 transition-colors outline-none hover:bg-white/[0.04] focus-visible:ring-2"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-neutral-100">
                        {zone.name}
                      </span>
                      <span className="text-muted mt-0.5 block truncate font-mono text-xs">
                        {describeZoneArea(zone)}
                      </span>
                    </span>
                    <span className="text-muted hidden items-center gap-2 text-xs sm:flex">
                      {zone.highestSeverity && <SeverityDot severity={zone.highestSeverity} />}
                      {describeRecentEvents(zone, RECENT_WINDOW)}
                    </span>
                    <ArrowRightIcon
                      aria-hidden
                      className="text-muted size-4 shrink-0 transition-transform group-hover:translate-x-0.5"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          id="dashboard-alerts"
          title="Latest alerts"
          action={alerts.length > 0 && <PanelLink href="/alerts">All alerts</PanelLink>}
          className="rise-in"
          style={riseDelay(550)}
        >
          {alerts.length === 0 ? (
            <p className="text-muted flex flex-1 items-center py-6 text-sm leading-relaxed">
              {zones.length === 0
                ? "Alerts show up here once you watch a zone."
                : "No event has reached your zones at their alert threshold yet."}
            </p>
          ) : (
            <ul className="-my-1">
              {alerts.map((alert) => (
                <li key={alert.id}>
                  <AlertRow alert={alert} now={generatedAt} compact />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.3fr]">
        <Panel id="dashboard-feeds" title="Data feeds" className="rise-in" style={riseDelay(650)}>
          <ul className="flex flex-col gap-4">
            {(Object.keys(feeds) as HazardSource[]).map((source) => {
              const run = runs.find((candidate) => candidate.source === source);
              const status = feedStatus(run, feeds[source].intervalMinutes, now);
              return (
                <li key={source} className="flex items-start gap-3">
                  <span aria-hidden className="relative mt-1.5 flex size-2 shrink-0">
                    {status === "ok" && (
                      <span className="bg-accent absolute inline-flex size-full rounded-full opacity-60 motion-safe:animate-ping" />
                    )}
                    <span
                      className={`relative inline-flex size-2 rounded-full ${feedDotClassNames[status]}`}
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <span className="text-sm font-medium text-neutral-100">
                        {hazardSourceLabels[source]}
                      </span>
                      <span className="text-muted font-mono text-xs">
                        {run ? (
                          <>
                            {feedLabels[status]}{" "}
                            <RelativeTime date={run.startedAt} now={generatedAt} />
                          </>
                        ) : (
                          "Not running"
                        )}
                      </span>
                    </span>
                    <span className="text-muted mt-0.5 block text-xs">
                      {feeds[source].covers} · {feeds[source].cadence.toLowerCase()}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </Panel>

        <Panel
          id="dashboard-world"
          title="Around the world"
          action={<PanelLink href="/map">Live map</PanelLink>}
          className="rise-in"
          style={riseDelay(750)}
        >
          <p className="text-muted -mt-2 mb-5 text-sm">Events active in the past 24 hours.</p>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {hazardKinds.map((kind) => {
              const Icon = hazardKindIcons[kind];
              const total = kinds[kind] ?? 0;
              return (
                <li
                  key={kind}
                  className={`flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3 ${
                    total === 0 ? "opacity-45" : ""
                  }`}
                >
                  <Icon
                    aria-hidden
                    className={`size-5 shrink-0 ${total > 0 ? "text-accent" : "text-muted"}`}
                  />
                  <span className="min-w-0">
                    <span className="block font-mono text-lg leading-tight text-neutral-50 tabular-nums">
                      {numberFormat.format(total)}
                    </span>
                    <span className="text-muted block truncate text-xs">
                      {total === 1 ? hazardKindNouns[kind].one : hazardKindNouns[kind].other}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>
    </AppPage>
  );
}
