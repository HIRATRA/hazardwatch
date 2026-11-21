"use client";

import { EnvelopeSimpleIcon } from "@phosphor-icons/react/dist/ssr";
import { useState, type FormEvent } from "react";

import { authClient } from "@/lib/auth-client";
import { getText } from "@/lib/form";

import { AuthField } from "./auth-field";
import { FormAlert, FormNotice, SubmitButton } from "./form-parts";

/**
 * Asks for a link to choose a new password. The answer is the same whether
 * or not an account uses the address, so that the form does not reveal who
 * has one.
 */
export function ForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = getText(new FormData(event.currentTarget), "email");
    setPending(true);
    setError(null);

    const { error } = await authClient.requestPasswordReset({
      email,
      // Where the link in the email leads, with the token in its query.
      redirectTo: "/reset-password",
    });

    setPending(false);
    if (error) {
      setError(error.message ?? "Unable to send the link.");
      return;
    }
    setSentTo(email);
  }

  if (sentTo) {
    return (
      <FormNotice>
        If an account uses <strong className="font-medium">{sentTo}</strong>, a link to choose a new
        password is on its way. It expires in one hour.
      </FormNotice>
    );
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
      {error && <FormAlert message={error} />}
      <SubmitButton pending={pending} pendingLabel="Sending the link…">
        Send me a link
      </SubmitButton>
    </form>
  );
}
