import { ChecksIcon } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Link from "next/link";

import { AlertRow } from "@/components/alerts/alert-row";
import { PushToggle } from "@/components/alerts/push-toggle";
import { EmailVerificationNotice } from "@/components/auth/email-verification-notice";
import { AppPage, PageIntro, riseDelay } from "@/components/layout/app-page";
import { Button, buttonClassName } from "@/components/ui/button";
import { panelClassName } from "@/components/ui/panel";
import { SignalRings } from "@/components/ui/signal-rings";
import { countUnreadAlerts, listAlerts } from "@/lib/alerts/queries";
import { env } from "@/lib/env";
import { requireSession } from "@/lib/session";

import { markAllAlertsRead } from "./actions";

export const metadata: Metadata = { title: "Alerts" };

export default async function AlertsPage() {
  const { user } = await requireSession();
  const [{ alerts, truncated, generatedAt }, unread] = await Promise.all([
    listAlerts(user.id),
    countUnreadAlerts(user.id),
  ]);

  return (
    <AppPage>
      <PageIntro
        eyebrow={unread > 0 ? `Alerts · ${unread} unread` : "Alerts"}
        title="What reached your zones."
        description="Events that reached your watch zones at or above their alert threshold, most recent first."
        actions={
          unread > 0 && (
            <form action={markAllAlertsRead}>
              <Button type="submit" variant="ghost">
                <ChecksIcon aria-hidden className="size-4" />
                Mark all as read
              </Button>
            </form>
          )
        }
      />

      <div className="rise-in mt-10 flex flex-col gap-3" style={riseDelay(300)}>
        {!user.emailVerified && <EmailVerificationNotice email={user.email} />}
        {env.VAPID_PUBLIC_KEY && <PushToggle publicKey={env.VAPID_PUBLIC_KEY} />}
      </div>

      {alerts.length === 0 ? (
        <div
          className={`${panelClassName} rise-in relative isolate mt-8 flex min-h-80 flex-col items-center justify-center overflow-hidden px-6 py-16 text-center`}
          style={riseDelay(400)}
        >
          <SignalRings size={22} className="top-[42%] left-1/2 -z-10" />
          <h2 className="mt-24 text-2xl font-light tracking-tight">No alerts yet</h2>
          <p className="text-muted mx-auto mt-3 max-w-md text-sm leading-relaxed text-pretty">
            When an event reaches one of your watch zones at or above its alert threshold, it shows
            up here.
          </p>
          <Link href="/zones" className={buttonClassName("ghost", "mt-7")}>
            Manage watch zones
          </Link>
        </div>
      ) : (
        <ol
          className={`${panelClassName} rise-in mt-8 divide-y divide-white/[0.06] p-2`}
          style={riseDelay(400)}
        >
          {alerts.map((alert) => (
            <li key={alert.id} className="py-0.5">
              <AlertRow alert={alert} now={generatedAt} />
            </li>
          ))}
        </ol>
      )}

      {truncated && (
        <p className="text-muted mt-4 text-sm">Showing the {alerts.length} most recent alerts.</p>
      )}
    </AppPage>
  );
}
