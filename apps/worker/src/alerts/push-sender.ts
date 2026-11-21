import webpush from "web-push";

import type { PushTarget } from "./push-repository.js";

/** How long a push service keeps a notification for a browser that is offline. */
const TIME_TO_LIVE_SECONDS = 60 * 60;

/** The push service no longer knows the browser, which unsubscribed or expired. */
export class PushTargetGoneError extends Error {
  constructor(options?: ErrorOptions) {
    super("The browser is no longer subscribed", options);
    this.name = "PushTargetGoneError";
  }
}

export interface PushSender {
  /**
   * Posts an encrypted message to a browser's push service. Rejects with
   * `PushTargetGoneError` when the browser is gone for good, and with any
   * other error when the push may succeed later.
   */
  send(target: PushTarget, payload: string): Promise<void>;
}

export interface VapidKeys {
  publicKey: string;
  privateKey: string;
  /** Contact for push services, as a mailto: or https: URL. */
  subject: string;
}

/** Sends push messages signed with the application's VAPID keys. */
export function createPushSender(vapid: VapidKeys): PushSender {
  const vapidDetails = { ...vapid };
  return {
    async send(target, payload) {
      try {
        await webpush.sendNotification(
          { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
          payload,
          { vapidDetails, TTL: TIME_TO_LIVE_SECONDS, urgency: "high" },
        );
      } catch (error) {
        // 404 and 410 mean the subscription expired or was revoked.
        if (
          error instanceof webpush.WebPushError &&
          (error.statusCode === 404 || error.statusCode === 410)
        ) {
          throw new PushTargetGoneError({ cause: error });
        }
        throw error;
      }
    },
  };
}
