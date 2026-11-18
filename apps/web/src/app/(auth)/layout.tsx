import { ArrowUpRightIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthScene } from "@/components/auth/auth-scene";
import { LogoMark } from "@/components/brand/logo";
import { toEarthEvents } from "@/components/home/earth-events";
import { formatEventCounts } from "@/lib/events/format";
import { loadRecentEvents } from "@/lib/events/recent";
import { countByKind } from "@/lib/events/summary";
import { getSession } from "@/lib/session";

/**
 * Sign in and sign up: the live planet on one side, on wide screens, and
 * the form on the other.
 */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  if (await getSession()) {
    redirect("/dashboard");
  }

  const now = new Date();
  const events = await loadRecentEvents(now);

  return (
    <div className="bg-ink grid min-h-dvh lg:grid-cols-[1.15fr_1fr]">
      <AuthScene
        events={toEarthEvents(events, now)}
        summary={formatEventCounts(countByKind(events))}
      />

      <div className="relative flex min-h-dvh flex-col bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,color-mix(in_oklch,var(--color-accent)_7%,transparent),transparent)] px-6 py-6 sm:px-10">
        <header className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-mono text-sm font-semibold tracking-widest uppercase"
          >
            <LogoMark className="size-6 text-neutral-100" />
            HazardWatch
          </Link>
          <Link
            href="/map"
            className="group text-muted inline-flex items-center gap-1 text-sm transition-colors hover:text-neutral-100"
          >
            Live map
            <ArrowUpRightIcon
              aria-hidden
              className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </Link>
        </header>

        <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-14">
          {children}
        </main>

        <p className="text-muted/70 text-center text-xs">
          Open data from USGS, NASA and GDACS. Not for emergency response.
        </p>
      </div>
    </div>
  );
}
