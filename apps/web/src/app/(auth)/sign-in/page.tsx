import type { Metadata } from "next";
import Link from "next/link";

import { SignInForm } from "@/components/auth/sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <>
      <h1 className="text-xl font-semibold">Sign in</h1>
      <p className="text-muted mt-1 mb-6 text-sm">Welcome back.</p>
      <SignInForm />
      <p className="text-muted mt-6 text-center text-sm">
        No account yet?{" "}
        <Link href="/sign-up" className="text-accent hover:underline">
          Create one
        </Link>
      </p>
    </>
  );
}
