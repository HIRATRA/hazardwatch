import type { Metadata } from "next";
import Link from "next/link";

import { EmailVerificationNotice } from "@/components/auth/email-verification-notice";
import { AccountActions } from "@/components/layout/account-actions";
import { SiteHeader } from "@/components/layout/site-header";
import { SeverityDot } from "@/components/map/severity";
import { Button, buttonClassName } from "@/components/ui/button";
import { RelativeTime } from "@/components/ui/relative-time";
import { countUnreadAlerts, listAlerts } from "@/lib/alerts/queries";
import { hazardSeverityLabels } from "@/lib/events/format";
import { requireSession } from "@/lib/session";

import { markAllAlertsRead, openAlert } from "./actions";

export const metadata: Metadata = { title: "Alerts" };

export default async function AlertsPage() {
  const { user } = await requireSession();
  const [{ alerts, truncated, generatedAt }, unread] = await Promise.all([
    listAlerts(user.id),
    countUnreadAlerts(user.id),
  ]);

  return (
    <>
      <SiteHeader>
        <AccountActions />
      </SiteHeader>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Alerts</h1>
            <p className="text-muted mt-1">
              Events that reached your watch zones at or above their alert threshold.
            </p>
          </div>
          {unread > 0 && (
            <form action={markAllAlertsRead}>
              <Button type="submit" variant="ghost">
                Mark all as read
              </Button>
            </form>
          )}
        </div>

        {!user.emailVerified && <EmailVerificationNotice email={user.email} className="mt-6" />}

        {alerts.length === 0 ? (
          <div className="border-border mt-8 rounded-lg border border-dashed px-6 py-12 text-center">
            <h2 className="font-medium">No alerts yet</h2>
            <p className="text-muted mx-auto mt-2 max-w-md text-sm">
              When an event reaches one of your watch zones at or above its alert threshold, it
              shows up here.
            </p>
            <Link href="/zones" className={buttonClassName("ghost", "mt-6")}>
              Manage watch zones
            </Link>
          </div>
        ) : (
          <ol className="border-border divide-border mt-8 divide-y rounded-lg border">
            {alerts.map((alert) => (
              <li key={alert.id}>
                {/* Opening an alert marks it as read, which a plain link could not do safely. */}
                <form action={openAlert.bind(null, alert.id)}>
                  <button
                    type="submit"
                    className="hover:bg-surface-raised focus-visible:ring-accent flex w-full items-start gap-3 px-4 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset"
                  >
                    <SeverityDot severity={alert.severity} className="mt-1.5" />
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block truncate text-sm ${alert.read ? "text-muted" : "font-medium"}`}
                      >
                        {!alert.read && <span className="sr-only">Unread: </span>}
                        {alert.eventTitle}
                      </span>
                      <span className="text-muted text-xs">
                        {hazardSeverityLabels[alert.severity]} · {alert.zoneName} ·{" "}
                        <RelativeTime date={alert.raisedAt} now={generatedAt} />
                      </span>
                    </span>
                    {!alert.read && (
                      <span aria-hidden className="bg-accent mt-2 size-2 shrink-0 rounded-full" />
                    )}
                  </button>
                </form>
              </li>
            ))}
          </ol>
        )}

        {truncated && (
          <p className="text-muted mt-4 text-sm">Showing the {alerts.length} most recent alerts.</p>
        )}
      </main>
    </>
  );
}
