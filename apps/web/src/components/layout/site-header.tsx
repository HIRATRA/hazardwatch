import Link from "next/link";
import type { ReactNode } from "react";

import { LogoMark } from "@/components/brand/logo";

interface SiteHeaderProps {
  /** Actions shown on the right, typically account links. */
  children?: ReactNode;
  /** Span the whole viewport instead of the centred content column. */
  fullWidth?: boolean;
  /**
   * Float over the top of the page, without a border, in the wide column of
   * the home page.
   */
  overlay?: boolean;
}

export function SiteHeader({ children, fullWidth = false, overlay = false }: SiteHeaderProps) {
  const column = fullWidth ? "" : overlay ? "mx-auto max-w-7xl" : "mx-auto max-w-5xl";
  return (
    <header className={overlay ? "absolute inset-x-0 top-0 z-10" : "border-border border-b"}>
      <div
        className={`flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-4 ${column}`}
      >
        {/* On narrow screens the account actions wrap below the navigation. */}
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-mono text-sm font-semibold tracking-widest uppercase"
          >
            <LogoMark className="size-6 text-neutral-100" />
            HazardWatch
          </Link>
          <nav aria-label="Main" className="flex items-center gap-4 text-sm whitespace-nowrap">
            <Link href="/map" className="text-muted hover:text-neutral-100">
              Live map
            </Link>
            <Link href="/zones" className="text-muted hover:text-neutral-100">
              Watch zones
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4 text-sm whitespace-nowrap">{children}</div>
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
