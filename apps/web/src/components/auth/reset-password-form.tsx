"use client";

import { LockSimpleIcon } from "@phosphor-icons/react/dist/ssr";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { authClient } from "@/lib/auth-client";
import { getText } from "@/lib/form";

import { AuthField } from "./auth-field";
import { FormAlert, SubmitButton } from "./form-parts";

const MIN_PASSWORD_LENGTH = 10;

/** Sets a new password with the token from the link in the reset email. */
export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const newPassword = getText(new FormData(event.currentTarget), "password", { trim: false });
    setPending(true);
    setError(null);

    const { error } = await authClient.resetPassword({ newPassword, token });

    if (error) {
      setError(
        error.code === "INVALID_TOKEN"
          ? "This link has expired or was already used. Ask for a new one."
          : (error.message ?? "Unable to change your password."),
      );
      setPending(false);
      return;
    }

    // Every session ended with the reset, so the new password is needed to sign in.
    router.replace("/sign-in?reset=done");
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-5">
      <AuthField
        label="New password"
        name="password"
        type="password"
        icon={LockSimpleIcon}
        autoComplete="new-password"
        minLength={MIN_PASSWORD_LENGTH}
        lengthHint
        required
      />
      {error && <FormAlert message={error} />}
      <SubmitButton pending={pending} pendingLabel="Saving…">
        Save my new password
      </SubmitButton>
    </form>
  );
}
