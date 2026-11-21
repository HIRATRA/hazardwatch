import { ArrowLeftIcon, PencilSimpleIcon } from "@phosphor-icons/react/dist/ssr";
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
        <div className="bg-ink flex items-center justify-between gap-4 border-b border-white/10 px-6 py-3.5">
          <div className="flex min-w-0 items-center gap-4">
            <Link
              href="/zones"
              aria-label="Back to watch zones"
              className="text-muted focus-visible:ring-accent grid size-9 shrink-0 place-items-center rounded-full border border-white/10 transition-[border-color,color,background-color] outline-none hover:border-white/25 hover:bg-white/5 hover:text-neutral-100 focus-visible:ring-2"
            >
              <ArrowLeftIcon aria-hidden className="size-4" />
            </Link>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-light tracking-tight">{zone.name}</h1>
              <p className="text-muted truncate font-mono text-xs">
                {describeZoneArea(zone)} · {describeAlerts(zone)}
              </p>
            </div>
          </div>
          <Link
            href={`/zones/${zone.id}/edit`}
            className={buttonClassName("ghost", "h-9 shrink-0 px-4")}
          >
            <PencilSimpleIcon aria-hidden className="size-4" />
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
