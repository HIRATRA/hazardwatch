import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AccountActions } from "@/components/layout/account-actions";
import { SiteHeader } from "@/components/layout/site-header";
import { ZoneForm } from "@/components/zones/zone-form";
import { requireSession } from "@/lib/session";
import { MAX_ZONES_PER_USER } from "@/lib/zones/input";
import { countZones } from "@/lib/zones/queries";

import { createZone } from "../actions";

export const metadata: Metadata = { title: "New watch zone" };

export default async function NewZonePage() {
  const { user } = await requireSession();
  // The zone list explains the limit.
  if ((await countZones(user.id)) >= MAX_ZONES_PER_USER) {
    redirect("/zones");
  }

  return (
    <div className="flex h-dvh flex-col">
      <SiteHeader fullWidth>
        <AccountActions />
      </SiteHeader>
      <main className="flex min-h-0 flex-1 flex-col">
        <ZoneForm
          title="New watch zone"
          action={createZone}
          submitLabel="Create zone"
          cancelHref="/zones"
        />
      </main>
    </div>
  );
}
