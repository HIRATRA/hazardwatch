import type { Metadata } from "next";

import { AccountActions } from "@/components/layout/account-actions";
import { SiteHeader } from "@/components/layout/site-header";
import { MapExplorer } from "@/components/map/map-explorer";
import { parseEventFilters } from "@/lib/events/filters";
import { listEvents } from "@/lib/events/queries";

export const metadata: Metadata = {
  title: "Live map",
  description: "Natural hazard events worldwide, updated every minute from open data feeds.",
};

export default async function MapPage({ searchParams }: PageProps<"/map">) {
  const filters = parseEventFilters(await searchParams);
  const result = await listEvents(filters);

  return (
    <div className="flex h-dvh flex-col">
      <SiteHeader fullWidth>
        <AccountActions />
      </SiteHeader>
      <main className="flex min-h-0 flex-1 flex-col">
        <h1 className="sr-only">Live hazard map</h1>
        <MapExplorer {...result} filters={filters} />
      </main>
    </div>
  );
}
