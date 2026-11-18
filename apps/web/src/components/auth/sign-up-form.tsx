"use client";

import { EnvelopeSimpleIcon, LockSimpleIcon, UserIcon } from "@phosphor-icons/react/dist/ssr";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { authClient } from "@/lib/auth-client";
import { getText } from "@/lib/form";

import { AuthField } from "./auth-field";
import { FormAlert, SubmitButton } from "./form-parts";

const MIN_PASSWORD_LENGTH = 10;

export function SignUpForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);

    const { error } = await authClient.signUp.email({
      name: getText(form, "name"),
      email: getText(form, "email"),
      password: getText(form, "password", { trim: false }),
      // Where the link in the confirmation email leads.
      callbackURL: "/dashboard",
    });

    if (error) {
      setError(error.message ?? "Unable to create your account.");
      setPending(false);
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-5">
      <AuthField label="Name" name="name" icon={UserIcon} autoComplete="name" required />
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
        autoComplete="new-password"
        minLength={MIN_PASSWORD_LENGTH}
        lengthHint
        required
      />
      {error && <FormAlert message={error} />}
      <SubmitButton pending={pending} pendingLabel="Creating your account…">
        Create account
      </SubmitButton>
    </form>
  );
}
