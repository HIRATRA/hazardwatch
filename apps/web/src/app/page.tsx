import type { HazardKind } from "@hazardwatch/db/constants";
import { hazardSeverities } from "@hazardwatch/db/constants";
import { connection } from "next/server";

import { Closing } from "@/components/home/closing";
import { Features } from "@/components/home/features";
import { Hero } from "@/components/home/hero";
import { LiveSummary } from "@/components/home/live-summary";
import type { EarthEvent } from "@/components/home/seismic-earth";
import { Sources } from "@/components/home/sources";
import { AccountActions } from "@/components/layout/account-actions";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { isRecent } from "@/lib/events/geojson";
import { listEvents } from "@/lib/events/queries";
import type { MapEvent } from "@/lib/events/types";

/** Events active in the past day, or none when the database cannot be reached. */
async function loadRecentEvents(now: Date): Promise<MapEvent[]> {
  try {
    const { events } = await listEvents({ kind: null, window: "24h", severity: "minor" }, { now });
    return events;
  } catch (error) {
    // The page still makes sense without live data, so it renders anyway.
    console.error("Could not load events for the home page", error);
    return [];
  }
}

const roundTenth = (value: number) => Math.round(value * 10) / 10;

export default async function HomePage() {
  // Live data: render on every request.
  await connection();
  const now = new Date();
  const events = await loadRecentEvents(now);

  const peaks: EarthEvent[] = events.map((event) => [
    roundTenth(event.longitude),
    roundTenth(event.latitude),
    hazardSeverities.indexOf(event.severity),
    isRecent(event, now) ? 1 : 0,
  ]);
  const counts: Partial<Record<HazardKind, number>> = {};
  for (const event of events) {
    counts[event.kind] = (counts[event.kind] ?? 0) + 1;
  }

  return (
    <div className="bg-ink relative min-h-dvh">
      <SiteHeader overlay>
        <AccountActions />
      </SiteHeader>
      <main>
        <Hero events={peaks} />
        <LiveSummary counts={counts} />
        <Features />
        <Sources />
        <Closing />
      </main>
      <SiteFooter />
    </div>
  );
}
