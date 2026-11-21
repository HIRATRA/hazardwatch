"use client";

import { EnvelopeSimpleIcon, LockSimpleIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { authClient } from "@/lib/auth-client";
import { getText } from "@/lib/form";

import { AuthField } from "./auth-field";
import { FormAlert, SubmitButton } from "./form-parts";

export function SignInForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);

    const { error } = await authClient.signIn.email({
      email: getText(form, "email"),
      password: getText(form, "password", { trim: false }),
    });

    if (error) {
      setError(error.message ?? "Unable to sign in.");
      setPending(false);
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-5">
      <AuthField
        label="Email"
        name="email"
        type="email"
        icon={EnvelopeSimpleIcon}
        autoComplete="email"
        placeholder="you@example.com"
        required
      />
      <AuthField
        label="Password"
        name="password"
        type="password"
        icon={LockSimpleIcon}
        autoComplete="current-password"
        labelAside={
          <Link
            href="/forgot-password"
            className="text-muted text-xs underline-offset-4 transition-colors hover:text-neutral-100 hover:underline"
          >
            Forgot password?
          </Link>
        }
        required
      />
      {error && <FormAlert message={error} />}
      <SubmitButton pending={pending} pendingLabel="Signing in…">
        Sign in
      </SubmitButton>
    </form>
  );
}
