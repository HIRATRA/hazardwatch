import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";

import { SignUpForm } from "@/components/auth/sign-up-form";

export const metadata: Metadata = { title: "Create an account" };

const delay = (milliseconds: number) => ({ "--delay": milliseconds }) as CSSProperties;

export default function SignUpPage() {
  return (
    <>
      <h1 className="rise-in text-3xl font-light tracking-tight sm:text-4xl" style={delay(0)}>
        Create your account
      </h1>
      <p className="rise-in text-muted mt-3" style={delay(100)}>
        Free. Draw watch zones and get alerts in the app and by email.
      </p>
      <div className="rise-in mt-9" style={delay(200)}>
        <SignUpForm />
      </div>
      <p className="rise-in text-muted mt-8 text-sm" style={delay(300)}>
        Already have an account?{" "}
        <Link
          href="/sign-in"
          className="text-neutral-100 underline decoration-white/25 underline-offset-4 transition-colors hover:decoration-current"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}
