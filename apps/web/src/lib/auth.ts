import "server-only";

import { account, session, user, verification } from "@hazardwatch/db";
import { resetPassword, verifyEmail } from "@hazardwatch/email";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { after } from "next/server";

import { db } from "./db";
import { mailer } from "./email";
import { env, previewOrigins } from "./env";

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  // A preview answers on its branch URL and on its own, both allowed to sign in.
  trustedOrigins: previewOrigins,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    // One hour, as the email says, and every other session ends with the reset.
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    // Runs after the response, so that response times do not reveal whether
    // an account exists.
    sendResetPassword: async ({ user, url }) => {
      await mailer
        ?.send({ to: user.email, ...resetPassword({ name: user.name, url }) })
        .catch((error: unknown) => console.error("Failed to send the password reset email", error));
    },
  },
  // Alerts are only emailed to confirmed addresses, so that nobody can sign
  // up with someone else's address and flood it.
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    // One hour, as the email says.
    expiresIn: 60 * 60,
    // Runs after the response, so that response times do not reveal whether
    // sending succeeded.
    sendVerificationEmail: async ({ user, url }) => {
      await mailer
        ?.send({ to: user.email, ...verifyEmail({ name: user.name, url }) })
        .catch((error: unknown) => console.error("Failed to send the verification email", error));
    },
  },
  advanced: {
    // Serverless platforms freeze a function once it has answered, which
    // would cut emails short. `after` keeps it running until they are sent.
    backgroundTasks: { handler: (task) => after(task) },
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
