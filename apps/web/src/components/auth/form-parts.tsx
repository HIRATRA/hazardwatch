import {
  ArrowRightIcon,
  CheckCircleIcon,
  CircleNotchIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/dist/ssr";
import type { ReactNode } from "react";

interface SubmitButtonProps {
  pending: boolean;
  children: ReactNode;
  /** Label while the form is being sent. */
  pendingLabel: string;
}

/** The full-width button that sends an authentication form. */
export function SubmitButton({ pending, children, pendingLabel }: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="group bg-accent hover:bg-accent-strong focus-visible:ring-accent focus-visible:ring-offset-ink mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-medium text-neutral-950 transition-[background-color,transform] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.99] disabled:cursor-wait disabled:opacity-80"
    >
      {pending ? (
        <>
          <CircleNotchIcon aria-hidden className="size-4 animate-spin" weight="bold" />
          {pendingLabel}
        </>
      ) : (
        <>
          {children}
          <ArrowRightIcon
            aria-hidden
            className="size-4 transition-transform group-hover:translate-x-0.5"
          />
        </>
      )}
    </button>
  );
}

/** An error returned by the server, announced to screen readers. */
export function FormAlert({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="border-danger/30 bg-danger/10 flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm text-neutral-100"
    >
      <WarningCircleIcon aria-hidden className="text-danger mt-0.5 size-4 shrink-0" weight="fill" />
      {message}
    </p>
  );
}

/** A confirmation, such as a link sent or a password changed. */
export function FormNotice({ children }: { children: ReactNode }) {
  return (
    <p
      role="status"
      className="border-accent/30 bg-accent/10 flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm text-neutral-100"
    >
      <CheckCircleIcon aria-hidden className="text-accent mt-0.5 size-4 shrink-0" weight="fill" />
      <span>{children}</span>
    </p>
  );
}
