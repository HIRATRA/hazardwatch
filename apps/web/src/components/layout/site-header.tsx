import Link from "next/link";
import type { ReactNode } from "react";

interface SiteHeaderProps {
  /** Actions shown on the right, typically account links. */
  children?: ReactNode;
  /** Span the whole viewport instead of the centred content column. */
  fullWidth?: boolean;
}

export function SiteHeader({ children, fullWidth = false }: SiteHeaderProps) {
  return (
    <header className="border-border border-b">
      <div
        className={`flex items-center justify-between gap-6 px-6 py-4 ${fullWidth ? "" : "mx-auto max-w-5xl"}`}
      >
        <div className="flex items-center gap-6">
          <Link href="/" className="font-mono text-sm font-semibold tracking-widest uppercase">
            HazardWatch
          </Link>
          <nav aria-label="Main" className="flex items-center gap-4 text-sm">
            <Link href="/map" className="text-muted hover:text-neutral-100">
              Live map
            </Link>
            <Link href="/zones" className="text-muted hover:text-neutral-100">
              Watch zones
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4 text-sm">{children}</div>
      </div>
    </header>
  );
}

/** Account links for visitors who are not signed in. */
export function GuestActions() {
  return (
    <>
      <Link href="/sign-in" className="text-muted hover:text-neutral-100">
        Sign in
      </Link>
      <Link
        href="/sign-up"
        className="bg-accent hover:bg-accent-strong rounded-md px-3 py-1.5 font-medium text-neutral-950"
      >
        Get started
      </Link>
    </>
  );
}
