import type { Metadata } from "next";
import Link from "next/link";

import { SignUpForm } from "@/components/auth/sign-up-form";

export const metadata: Metadata = { title: "Create an account" };

export default function SignUpPage() {
  return (
    <>
      <h1 className="text-xl font-semibold">Create an account</h1>
      <p className="text-muted mt-1 mb-6 text-sm">Start monitoring hazards in minutes.</p>
      <SignUpForm />
      <p className="text-muted mt-6 text-center text-sm">
        Already have an account?{" "}
        <Link href="/sign-in" className="text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
