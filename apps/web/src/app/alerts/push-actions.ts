"use server";

import { and, eq, pushSubscriptions } from "@hazardwatch/db";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";

const base64Url = z
  .string()
  .regex(/^[A-Za-z0-9_-]+={0,2}$/)
  .max(256);

/** A browser's subscription, as `PushSubscription.toJSON()` describes it. */
const subscriptionSchema = z.object({
  endpoint: z.url({ protocol: /^https$/ }).max(2048),
  keys: z.object({ p256dh: base64Url, auth: base64Url }),
});

/**
 * Remembers a browser that agreed to receive the user's alerts. A browser
 * that subscribed for another account before now belongs to this one.
 */
export async function savePushSubscription(subscription: unknown): Promise<{ ok: boolean }> {
  const { user } = await requireSession();
  const parsed = subscriptionSchema.safeParse(subscription);
  if (!parsed.success) {
    return { ok: false };
  }

  const { endpoint, keys } = parsed.data;
  await db
    .insert(pushSubscriptions)
    .values({ userId: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { userId: user.id, p256dh: keys.p256dh, auth: keys.auth },
    });
  return { ok: true };
}

/** Forgets one of the user's browsers, which no longer receives their alerts. */
export async function deletePushSubscription(endpoint: unknown): Promise<void> {
  const { user } = await requireSession();
  if (typeof endpoint !== "string") {
    return;
  }
  await db
    .delete(pushSubscriptions)
    .where(and(eq(pushSubscriptions.endpoint, endpoint), eq(pushSubscriptions.userId, user.id)));
}
