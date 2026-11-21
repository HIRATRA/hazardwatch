"use client";

import { BellRingingIcon, BellSlashIcon } from "@phosphor-icons/react/dist/ssr";
import { useEffect, useState } from "react";

import { savePushSubscription } from "@/app/alerts/push-actions";
import { Button } from "@/components/ui/button";
import { currentSubscription, forgetThisBrowser, pushSupport, subscribe } from "@/lib/push/browser";

type Status = "checking" | "unsupported" | "needs-install" | "denied" | "off" | "on";

const descriptions: Record<Status, string> = {
  checking: "Checking this device…",
  unsupported: "This browser cannot show notifications. Alerts still reach you here and by email.",
  "needs-install":
    "On iPhone and iPad, add HazardWatch to your Home Screen from the Share menu, then open it from there to turn notifications on.",
  denied:
    "Notifications are blocked for this site. Allow them in your browser settings, then reload this page.",
  off: "Get a notification on this device as soon as an event reaches one of your zones.",
  on: "This device gets a notification for every new alert.",
};

/**
 * Turns alert notifications on or off for this device. Each browser has its
 * own subscription, so the choice applies to this device only.
 */
export function PushToggle({ publicKey }: { publicKey: string }) {
  const [status, setStatus] = useState<Status>("checking");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function check(): Promise<Status> {
      const support = pushSupport();
      if (support !== "supported") {
        return support;
      }
      if (Notification.permission === "denied") {
        return "denied";
      }
      const subscription = await currentSubscription();
      if (!subscription) {
        return "off";
      }
      // The browser may have subscribed for another account on this device.
      const { ok } = await savePushSubscription(subscription.toJSON());
      return ok ? "on" : "off";
    }
    check()
      .then((next) => {
        if (!cancelled) setStatus(next);
      })
      .catch(() => {
        if (!cancelled) setStatus("off");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function turnOn() {
    setPending(true);
    setError(null);
    try {
      const subscription = await subscribe(publicKey);
      if (!subscription) {
        setStatus(Notification.permission === "denied" ? "denied" : "off");
        return;
      }
      const { ok } = await savePushSubscription(subscription.toJSON());
      if (!ok) {
        await subscription.unsubscribe();
        setError("This browser's subscription was not accepted. Try again later.");
        return;
      }
      setStatus("on");
    } catch {
      setError("Notifications could not be turned on. Try again in a moment.");
    } finally {
      setPending(false);
    }
  }

  async function turnOff() {
    setPending(true);
    setError(null);
    await forgetThisBrowser();
    setStatus("off");
    setPending(false);
  }

  const Icon = status === "on" ? BellRingingIcon : BellSlashIcon;

  return (
    <section
      aria-labelledby="push-heading"
      className="border-border bg-surface flex flex-wrap items-center gap-4 rounded-lg border px-4 py-3"
    >
      <span
        aria-hidden
        className={`flex size-9 shrink-0 items-center justify-center rounded-md ${
          status === "on" ? "bg-accent/15 text-accent" : "bg-surface-raised text-muted"
        }`}
      >
        <Icon size={18} weight={status === "on" ? "fill" : "regular"} />
      </span>
      <div className="min-w-0 flex-1">
        <h2 id="push-heading" className="text-sm font-medium">
          Push notifications
        </h2>
        <p className="text-muted text-sm" aria-live="polite">
          {error ?? descriptions[status]}
        </p>
      </div>
      {status === "off" && (
        <Button onClick={() => void turnOn()} disabled={pending}>
          {pending ? "Turning on…" : "Turn on"}
        </Button>
      )}
      {status === "on" && (
        <Button variant="ghost" onClick={() => void turnOff()} disabled={pending}>
          {pending ? "Turning off…" : "Turn off"}
        </Button>
      )}
    </section>
  );
}
