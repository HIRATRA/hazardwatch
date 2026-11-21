import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AccountActions } from "@/components/layout/account-actions";
import { SiteHeader } from "@/components/layout/site-header";
import { DeleteZoneButton } from "@/components/zones/delete-zone-button";
import { ZoneForm } from "@/components/zones/zone-form";
import { requireSession } from "@/lib/session";
import { getZone } from "@/lib/zones/queries";

import { updateZone } from "../../actions";

export const metadata: Metadata = { title: "Edit watch zone" };

export default async function EditZonePage({ params }: PageProps<"/zones/[id]/edit">) {
  const { user } = await requireSession();
  const zone = await getZone(user.id, (await params).id);
  if (!zone) {
    notFound();
  }

  return (
    <div className="flex h-dvh flex-col">
      <SiteHeader fullWidth>
        <AccountActions />
      </SiteHeader>
      <main className="flex min-h-0 flex-1 flex-col">
        <ZoneForm
          title="Edit watch zone"
          zone={zone}
          action={updateZone.bind(null, zone.id)}
          submitLabel="Save changes"
          cancelHref={`/zones/${zone.id}`}
        >
          <section aria-labelledby="delete-zone-title" className="px-6 pb-8">
            <div className="border-danger/20 bg-danger/[0.04] rounded-2xl border p-5">
              <h2 id="delete-zone-title" className="text-sm font-medium text-neutral-100">
                Delete this zone
              </h2>
              <p className="text-muted mt-1 mb-4 text-sm">
                The zone stops being watched and its alerts go with it. Events are not affected.
              </p>
              <DeleteZoneButton zoneId={zone.id} zoneName={zone.name} />
            </div>
          </section>
        </ZoneForm>
      </main>
    </div>
  );
}
