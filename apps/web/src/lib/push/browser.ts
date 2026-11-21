/**
 * Push notifications in the browser: registering the service worker and
 * subscribing to the push service. Runs on the client only.
 */

import { deletePushSubscription } from "@/app/alerts/push-actions";

import { decodeBase64Url } from "./base64-url";

/** What this browser allows. */
export type PushSupport =
  | "supported"
  /** iPhones and iPads deliver push notifications to installed apps only. */
  | "needs-install"
  | "unsupported";

export function pushSupport(): PushSupport {
  if ("serviceWorker" in navigator && "PushManager" in window && "Notification" in window) {
    return "supported";
  }
  const appleMobile =
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    // iPadOS reports itself as a Mac with a touch screen.
    (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1);
  return appleMobile ? "needs-install" : "unsupported";
}

async function registration(): Promise<ServiceWorkerRegistration> {
  await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  return navigator.serviceWorker.ready;
}

/** The subscription of this browser, or null when it has none. */
export async function currentSubscription(): Promise<PushSubscription | null> {
  const existing = await navigator.serviceWorker.getRegistration("/");
  return existing ? existing.pushManager.getSubscription() : null;
}

/**
 * Asks for permission when needed and subscribes this browser to the push
 * service. Resolves to null when the user declines.
 */
export async function subscribe(publicKey: string): Promise<PushSubscription | null> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return null;
  }
  const { pushManager } = await registration();
  return pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: decodeBase64Url(publicKey),
  });
}

/**
 * Stops this browser from receiving the signed-in user's alerts, before they
 * sign out on a device someone else may use. Never rejects.
 */
export async function forgetThisBrowser(): Promise<void> {
  if (pushSupport() !== "supported") {
    return;
  }
  try {
    const subscription = await currentSubscription();
    if (subscription) {
      await deletePushSubscription(subscription.endpoint);
      await subscription.unsubscribe();
    }
  } catch {
    // Signing out matters more. The worker forgets browsers that are gone.
  }
}
