import { count, desc, hazardEvents, ingestionRuns } from "@hazardwatch/db";
import type { Metadata } from "next";

import { AccountActions } from "@/components/layout/account-actions";
import { SiteHeader } from "@/components/layout/site-header";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Dashboard" };

const dateFormatter = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });

export default async function DashboardPage() {
  const { user } = await requireSession();

  const [[eventStats], [lastRun]] = await Promise.all([
    db.select({ total: count() }).from(hazardEvents),
    db.select().from(ingestionRuns).orderBy(desc(ingestionRuns.startedAt)).limit(1),
  ]);

  return (
    <>
      <SiteHeader>
        <AccountActions />
      </SiteHeader>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-2xl font-semibold">Welcome, {user.name}</h1>
        <p className="text-muted mt-1">
          Signed in as {user.email}. Here is the current state of the hazard feed.
        </p>

        <dl className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="border-border bg-surface-raised rounded-lg border p-5">
            <dt className="text-muted text-sm">Events tracked</dt>
            <dd className="mt-2 font-mono text-3xl">{eventStats?.total ?? 0}</dd>
          </div>
          <div className="border-border bg-surface-raised rounded-lg border p-5">
            <dt className="text-muted text-sm">Last ingestion</dt>
            <dd className="mt-2 text-lg">
              {lastRun
                ? `${lastRun.source} · ${lastRun.status} · ${dateFormatter.format(lastRun.startedAt)}`
                : "No ingestion run yet"}
            </dd>
          </div>
        </dl>
      </main>
    </>
  );
}
