import type { Metadata } from "next";
import Link from "next/link";

import { AccountActions } from "@/components/layout/account-actions";
import { SiteHeader } from "@/components/layout/site-header";
import { buttonClassName } from "@/components/ui/button";
import { requireSession } from "@/lib/session";
import { describeZoneArea } from "@/lib/zones/format";
import { MAX_ZONES_PER_USER } from "@/lib/zones/input";
import { listZones } from "@/lib/zones/queries";

export const metadata: Metadata = { title: "Watch zones" };

export default async function ZonesPage() {
  const { user } = await requireSession();
  const zones = await listZones(user.id);
  const canAddZone = zones.length < MAX_ZONES_PER_USER;

  return (
    <>
      <SiteHeader>
        <AccountActions />
      </SiteHeader>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Watch zones</h1>
            <p className="text-muted mt-1">
              The places you follow, and the hazards located around them.
            </p>
          </div>
          {canAddZone && zones.length > 0 && (
            <Link href="/zones/new" className={buttonClassName()}>
              New zone
            </Link>
          )}
        </div>

        {zones.length === 0 ? (
          <div className="border-border mt-8 rounded-lg border border-dashed px-6 py-12 text-center">
            <h2 className="font-medium">No watch zones yet</h2>
            <p className="text-muted mx-auto mt-2 max-w-md text-sm">
              Add the places you care about, such as your home, an office or a supplier, to follow
              the hazards around them.
            </p>
            <Link href="/zones/new" className={buttonClassName("primary", "mt-6")}>
              Create your first zone
            </Link>
          </div>
        ) : (
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {zones.map((zone) => (
              <li key={zone.id}>
                <Link
                  href={`/zones/${zone.id}/edit`}
                  className="border-border bg-surface-raised hover:border-muted focus-visible:ring-accent block rounded-lg border p-5 outline-none focus-visible:ring-2"
                >
                  <h2 className="truncate font-medium">{zone.name}</h2>
                  <p className="text-muted mt-1 text-sm">{describeZoneArea(zone)}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {!canAddZone && (
          <p className="text-muted mt-6 text-sm">
            You are watching {MAX_ZONES_PER_USER} zones, the most an account can have. Delete one to
            add another.
          </p>
        )}
      </main>
    </>
  );
}
