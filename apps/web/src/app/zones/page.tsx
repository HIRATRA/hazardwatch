import { ArrowRightIcon, BellIcon, BellSlashIcon, PlusIcon } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Link from "next/link";

import { AppPage, PageIntro, riseDelay } from "@/components/layout/app-page";
import { SeverityDot, severityStyles } from "@/components/map/severity";
import { buttonClassName } from "@/components/ui/button";
import { panelClassName } from "@/components/ui/panel";
import { SignalRings } from "@/components/ui/signal-rings";
import { requireSession } from "@/lib/session";
import { describeAlerts, describeRecentEvents, describeZoneArea } from "@/lib/zones/format";
import { MAX_ZONES_PER_USER } from "@/lib/zones/input";
import { listZones, RECENT_WINDOW } from "@/lib/zones/queries";

export const metadata: Metadata = { title: "Watch zones" };

/** Colour of a zone without recent events. */
const QUIET_COLOR = "oklch(0.68 0.02 250)";

export default async function ZonesPage() {
  const { user } = await requireSession();
  const zones = await listZones(user.id);
  const canAddZone = zones.length < MAX_ZONES_PER_USER;

  return (
    <AppPage>
      <PageIntro
        eyebrow={
          zones.length > 0
            ? `Watch zones · ${zones.length} of ${MAX_ZONES_PER_USER}`
            : "Watch zones"
        }
        title="The places you follow."
        description="Each zone is a circle on the map. Hazards located inside it show up here, and raise alerts from the severity you choose."
        actions={
          canAddZone &&
          zones.length > 0 && (
            <Link href="/zones/new" className={buttonClassName()}>
              <PlusIcon aria-hidden weight="bold" className="size-4" />
              New zone
            </Link>
          )
        }
      />

      {zones.length === 0 ? (
        <div
          className={`${panelClassName} rise-in relative isolate mt-14 flex min-h-96 flex-col items-center justify-center overflow-hidden px-6 py-16 text-center`}
          style={riseDelay(300)}
        >
          <SignalRings size={24} className="top-[38%] left-1/2 -z-10" />
          <h2 className="mt-28 text-2xl font-light tracking-tight">No watch zones yet</h2>
          <p className="text-muted mx-auto mt-3 max-w-md text-sm leading-relaxed text-pretty">
            Add the places you care about, such as your home, an office or a supplier, to follow the
            hazards around them.
          </p>
          <Link href="/zones/new" className={buttonClassName("primary", "mt-7")}>
            <PlusIcon aria-hidden weight="bold" className="size-4" />
            Create your first zone
          </Link>
        </div>
      ) : (
        <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {zones.map((zone, index) => {
            const color = zone.highestSeverity
              ? severityStyles[zone.highestSeverity].color
              : QUIET_COLOR;
            const AlertIcon = zone.alertMinSeverity ? BellIcon : BellSlashIcon;
            return (
              <li
                key={zone.id}
                className="rise-in"
                style={riseDelay(250 + Math.min(index, 8) * 60)}
              >
                <Link
                  href={`/zones/${zone.id}`}
                  className={`${panelClassName} group focus-visible:ring-accent focus-visible:ring-offset-ink relative isolate flex h-full min-h-60 flex-col overflow-hidden p-6 transition-[border-color,background-color] outline-none hover:border-white/20 hover:bg-white/[0.04] focus-visible:ring-2 focus-visible:ring-offset-2`}
                >
                  <SignalRings
                    size={12}
                    color={color}
                    live={zone.highestSeverity === "severe" || zone.highestSeverity === "extreme"}
                    className="top-12 right-12 -z-10 transition-transform duration-700 group-hover:scale-110"
                  />
                  <h2 className="truncate pr-24 text-2xl font-light tracking-tight">{zone.name}</h2>
                  <p className="text-muted mt-2 pr-24 font-mono text-xs leading-relaxed">
                    {describeZoneArea(zone)}
                  </p>

                  <div className="mt-auto flex items-end justify-between gap-4 pt-10">
                    <div className="flex min-w-0 flex-col gap-2">
                      <p className="flex items-center gap-2 text-sm text-neutral-100">
                        {zone.highestSeverity && <SeverityDot severity={zone.highestSeverity} />}
                        {describeRecentEvents(zone, RECENT_WINDOW)}
                      </p>
                      <p className="text-muted flex items-center gap-2 text-xs">
                        <AlertIcon aria-hidden className="size-3.5 shrink-0" />
                        {describeAlerts(zone)}
                      </p>
                    </div>
                    <span
                      aria-hidden
                      className="grid size-9 shrink-0 place-items-center rounded-full border border-white/10 transition-[border-color,background-color] group-hover:border-white/25 group-hover:bg-white/5"
                    >
                      <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}

          {canAddZone && (
            <li className="rise-in" style={riseDelay(250 + Math.min(zones.length, 8) * 60)}>
              <Link
                href="/zones/new"
                className="group text-muted focus-visible:ring-accent focus-visible:ring-offset-ink flex h-full min-h-60 flex-col items-center justify-center gap-3 rounded-[1.75rem] border border-dashed border-white/15 p-6 transition-[border-color,color,background-color] outline-none hover:border-white/30 hover:bg-white/[0.02] hover:text-neutral-100 focus-visible:ring-2 focus-visible:ring-offset-2"
              >
                <span className="grid size-11 place-items-center rounded-full border border-current/30 transition-transform group-hover:rotate-90">
                  <PlusIcon aria-hidden className="size-5" />
                </span>
                <span className="text-sm">Watch another place</span>
              </Link>
            </li>
          )}
        </ul>
      )}

      {!canAddZone && (
        <p className="text-muted mt-6 text-sm">
          You are watching {MAX_ZONES_PER_USER} zones, the most an account can have. Delete one to
          add another.
        </p>
      )}
    </AppPage>
  );
}
