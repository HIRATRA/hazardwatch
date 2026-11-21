import type { CSSProperties, ReactNode } from "react";

import { AccountActions } from "./account-actions";
import { SiteHeader } from "./site-header";

/** Entrance delay of a `rise-in` element, in milliseconds. */
export const riseDelay = (milliseconds: number) => ({ "--delay": milliseconds }) as CSSProperties;

/**
 * Frame of the pages for signed in users, in the colours of the home page:
 * the header over the ink background, lit from the top by a glow of the
 * accent colour, and a centred column.
 */
export function AppPage({ children }: { children: ReactNode }) {
  return (
    <div className="bg-ink relative isolate min-h-dvh">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[36rem] bg-[radial-gradient(ellipse_60%_60%_at_50%_0%,color-mix(in_oklch,var(--color-accent)_8%,transparent),transparent)]"
      />
      <SiteHeader>
        <AccountActions />
      </SiteHeader>
      <main className="mx-auto max-w-6xl px-6 pt-14 pb-28 md:pt-20">{children}</main>
    </div>
  );
}

interface PageIntroProps {
  /** Short label above the title, in small capitals. */
  eyebrow: ReactNode;
  title: string;
  description?: ReactNode;
  /** Shown at the end of the intro, such as the main action of the page. */
  actions?: ReactNode;
}

/** The top of a page: a label, a large light title and what the page is for. */
export function PageIntro({ eyebrow, title, description, actions }: PageIntroProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
      <div className="max-w-2xl">
        <p
          className="rise-in text-muted flex items-center gap-2.5 font-mono text-xs tracking-[0.2em] uppercase"
          style={riseDelay(0)}
        >
          <span aria-hidden className="bg-accent size-1.5 rounded-full" />
          {eyebrow}
        </p>
        <h1
          className="rise-in mt-5 text-4xl leading-[1.08] font-light tracking-tight text-balance md:text-5xl"
          style={riseDelay(100)}
        >
          {title}
        </h1>
        {description && (
          <p
            className="rise-in text-muted mt-4 text-lg leading-relaxed text-pretty"
            style={riseDelay(200)}
          >
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="rise-in flex flex-wrap items-center gap-3" style={riseDelay(300)}>
          {actions}
        </div>
      )}
    </div>
  );
}
