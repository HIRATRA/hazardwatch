import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { user } from "./auth.js";

/**
 * A browser that agreed to receive a user's alerts as push notifications,
 * as the Push API describes it: the push service URL to post to and the
 * keys that encrypt messages for that browser alone. A user has one per
 * device or browser profile.
 */
export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Push service URL, unique to the browser. */
    endpoint: text("endpoint").notNull().unique(),
    /** Public key of the browser, for encrypting messages, base64url encoded. */
    p256dh: text("p256dh").notNull(),
    /** Authentication secret of the browser, base64url encoded. */
    auth: text("auth").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("push_subscriptions_user_id_idx").on(t.userId)],
);

export type PushSubscriptionRow = typeof pushSubscriptions.$inferSelect;
