import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";

import { FormAlert } from "@/components/auth/form-parts";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = { title: "Choose a new password" };

const delay = (milliseconds: number) => ({ "--delay": milliseconds }) as CSSProperties;

/**
 * Where the link in the reset email leads, with a token in its query, or an
 * error when the link has expired or was already used.
 */
export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const { token, error } = await searchParams;
  const valid = typeof token === "string" && token.length > 0 && !error;

  return (
    <>
      <h1 className="rise-in text-3xl font-light tracking-tight sm:text-4xl" style={delay(0)}>
        Choose a new password
      </h1>
      <p className="rise-in text-muted mt-3" style={delay(100)}>
        {valid
          ? "You will sign in with it from now on, on every device."
          : "This link no longer works."}
      </p>
      <div className="rise-in mt-9" style={delay(200)}>
        {valid ? (
          <ResetPasswordForm token={token} />
        ) : (
          <FormAlert message="The link has expired or was already used. Links work once, for one hour." />
        )}
      </div>
      <p className="rise-in text-muted mt-8 text-sm" style={delay(300)}>
        {valid ? "Changed your mind?" : "Need a new link?"}{" "}
        <Link
          href={valid ? "/sign-in" : "/forgot-password"}
          className="text-neutral-100 underline decoration-white/25 underline-offset-4 transition-colors hover:decoration-current"
        >
          {valid ? "Sign in" : "Ask for a new one"}
        </Link>
      </p>
    </>
  );
}
