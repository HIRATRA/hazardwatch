"use client";

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
      className={`border-accent/40 bg-accent/10 rounded-lg border px-4 py-3 text-sm ${className}`}
    >
      {invalidLink ? (
        <p>
          This confirmation link is invalid or has expired. Ask for a new one to confirm{" "}
          <span className="font-medium">{email}</span>.
        </p>
      ) : (
        <p>
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
            className="text-accent focus-visible:ring-accent rounded outline-none hover:underline focus-visible:ring-2 disabled:opacity-60"
          >
            {status === "sending" ? "Sending…" : "Send a new link"}
          </button>
        )}
      </p>
    </div>
  );
}
