import "server-only";

import { account, session, user, verification } from "@hazardwatch/db";
import { verifyEmail } from "@hazardwatch/email";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { db } from "./db";
import { mailer } from "./email";
import { env } from "./env";

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
  },
  // Alerts are only emailed to confirmed addresses, so that nobody can sign
  // up with someone else's address and flood it.
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    // One hour, as the email says.
    expiresIn: 60 * 60,
    sendVerificationEmail: ({ user, url }) => {
      // Not awaited, so that response times do not reveal whether sending
      // succeeded, as Better Auth recommends.
      void mailer
        ?.send({ to: user.email, ...verifyEmail({ name: user.name, url }) })
        .catch((error: unknown) => console.error("Failed to send the verification email", error));
      return Promise.resolve();
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  telemetry: {
    enabled: false,
  },
  // Must stay last so Set-Cookie headers from server actions reach the browser.
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
