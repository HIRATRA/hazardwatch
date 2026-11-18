import { connection } from "next/server";
import type { CSSProperties } from "react";

import { Closing } from "@/components/home/closing";
import { toEarthEvents } from "@/components/home/earth-events";
import { Features } from "@/components/home/features";
import { Hero } from "@/components/home/hero";
import { LiveSummary } from "@/components/home/live-summary";
import { Sources } from "@/components/home/sources";
import { AccountActions } from "@/components/layout/account-actions";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { loadRecentEvents } from "@/lib/events/recent";
import { countByKind } from "@/lib/events/summary";

export default async function HomePage() {
  // Live data: render on every request.
  await connection();
  const now = new Date();
  const events = await loadRecentEvents(now);

  const peaks = toEarthEvents(events, now);
  const counts = countByKind(events);

  return (
    <div className="bg-ink relative min-h-dvh">
      <SiteHeader overlay className="rise-in" style={{ "--delay": 900 } as CSSProperties}>
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
