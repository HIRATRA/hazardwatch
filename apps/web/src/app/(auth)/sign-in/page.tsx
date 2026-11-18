import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";

import { SignInForm } from "@/components/auth/sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

const delay = (milliseconds: number) => ({ "--delay": milliseconds }) as CSSProperties;

export default function SignInPage() {
  return (
    <>
      <h1 className="rise-in text-3xl font-light tracking-tight sm:text-4xl" style={delay(0)}>
        Welcome back
      </h1>
      <p className="rise-in text-muted mt-3" style={delay(100)}>
        Sign in to follow your watch zones and alerts.
      </p>
      <div className="rise-in mt-9" style={delay(200)}>
        <SignInForm />
      </div>
      <p className="rise-in text-muted mt-8 text-sm" style={delay(300)}>
        New to HazardWatch?{" "}
        <Link
          href="/sign-up"
          className="text-neutral-100 underline decoration-white/25 underline-offset-4 transition-colors hover:decoration-current"
        >
          Create an account
        </Link>
      </p>
    </>
  );
}
