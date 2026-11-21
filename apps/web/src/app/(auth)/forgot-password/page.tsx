import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = { title: "Forgot password" };

const delay = (milliseconds: number) => ({ "--delay": milliseconds }) as CSSProperties;

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="rise-in text-3xl font-light tracking-tight sm:text-4xl" style={delay(0)}>
        Forgot your password?
      </h1>
      <p className="rise-in text-muted mt-3" style={delay(100)}>
        Enter the address you signed up with, and we will email you a link to choose a new one.
      </p>
      <div className="rise-in mt-9" style={delay(200)}>
        <ForgotPasswordForm />
      </div>
      <p className="rise-in text-muted mt-8 text-sm" style={delay(300)}>
        Remembered it?{" "}
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
