import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AccountActions } from "@/components/layout/account-actions";
import { SiteHeader } from "@/components/layout/site-header";
import { MapExplorer } from "@/components/map/map-explorer";
import { buttonClassName } from "@/components/ui/button";
import { parseEventFilters } from "@/lib/events/filters";
import { listEvents } from "@/lib/events/queries";
import { getSession, requireSession } from "@/lib/session";
import { describeAlerts, describeZoneArea } from "@/lib/zones/format";
import { getZone } from "@/lib/zones/queries";

export async function generateMetadata({ params }: PageProps<"/zones/[id]">): Promise<Metadata> {
  const session = await getSession();
  const zone = session ? await getZone(session.user.id, (await params).id) : null;
  return { title: zone?.name ?? "Watch zone" };
}

export default async function ZonePage({ params, searchParams }: PageProps<"/zones/[id]">) {
  const { user } = await requireSession();
  const zone = await getZone(user.id, (await params).id);
  if (!zone) {
    notFound();
  }

  const query = await searchParams;
  const filters = parseEventFilters(query);
  const result = await listEvents(filters, { zoneId: zone.id });
  // Set when coming from an alert. An unknown id selects nothing.
  const selectedEventId = typeof query.event === "string" ? query.event : null;

  return (
    <div className="flex h-dvh flex-col">
      <SiteHeader fullWidth>
        <AccountActions />
      </SiteHeader>
      <main className="flex min-h-0 flex-1 flex-col">
        <div className="border-border flex items-center justify-between gap-4 border-b px-6 py-3">
          <div className="min-w-0">
            <Link href="/zones" className="text-muted text-xs hover:text-neutral-100">
              Watch zones
            </Link>
            <h1 className="truncate text-lg font-semibold">{zone.name}</h1>
            <p className="text-muted text-xs">
              {describeZoneArea(zone)} · {describeAlerts(zone)}
            </p>
          </div>
          <Link href={`/zones/${zone.id}/edit`} className={buttonClassName("ghost", "shrink-0")}>
            Edit
          </Link>
        </div>
        <MapExplorer
          {...result}
          filters={filters}
          zone={zone}
          initialSelectedId={selectedEventId}
        />
      </main>
    </div>
  );
}
