"use client";

import { EnvelopeSimpleIcon } from "@phosphor-icons/react/dist/ssr";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";

interface EmailVerificationNoticeProps {
  email: string;
  /** Whether the user arrived through a confirmation link that did not work. */
  invalidLink?: boolean;
  className?: string;
}

/** Asks users who have not confirmed their address yet to do so, and resends the link. */
export function EmailVerificationNotice({
  email,
  invalidLink = false,
  className = "",
}: EmailVerificationNoticeProps) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  async function resend() {
    setStatus("sending");
    const { error } = await authClient.sendVerificationEmail({ email, callbackURL: "/dashboard" });
    setStatus(error ? "failed" : "sent");
  }

  return (
    <div
      role="status"
      className={`border-accent/25 bg-accent/[0.07] flex items-start gap-3.5 rounded-2xl border px-4 py-3.5 text-sm ${className}`}
    >
      <span
        aria-hidden
        className="bg-accent/15 text-accent grid size-9 shrink-0 place-items-center rounded-xl"
      >
        <EnvelopeSimpleIcon className="size-[18px]" weight="fill" />
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        {invalidLink ? (
          <p className="text-neutral-100">
            This confirmation link is invalid or has expired. Ask for a new one to confirm{" "}
            <span className="font-medium">{email}</span>.
          </p>
        ) : (
          <p className="text-neutral-100">
            Confirm your email address to receive alerts by email. We sent a link to{" "}
            <span className="font-medium">{email}</span>.
          </p>
        )}
        <p className="text-muted mt-1">
          {status === "sent" && "A new link is on its way."}
          {status === "failed" && "The link could not be sent. Try again in a moment."}
          {(status === "idle" || status === "sending") && (
            <button
              type="button"
              onClick={() => void resend()}
              disabled={status === "sending"}
              className="text-accent focus-visible:ring-accent rounded-sm underline decoration-current/30 underline-offset-4 outline-none transition-colors hover:decoration-current focus-visible:ring-2 disabled:opacity-60"
            >
              {status === "sending" ? "Sending…" : "Send a new link"}
            </button>
          )}
        </p>
      </div>
    </div>
  );
}
