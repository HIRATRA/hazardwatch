import "server-only";

import { createMailer, type Mailer } from "@hazardwatch/email";

import { env } from "./env";

/** Sends email through the configured SMTP server, or null when there is none. */
export const mailer: Mailer | null = env.SMTP_URL
  ? createMailer({ smtpUrl: env.SMTP_URL, from: env.EMAIL_FROM })
  : null;

if (!mailer) {
  console.warn("SMTP_URL is not set: no email is sent, not even address confirmations.");
}
