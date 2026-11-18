import type { CSSProperties } from "react";

import type { EarthEvent } from "@/components/home/seismic-earth";
import { SeismicEarth } from "@/components/home/seismic-earth";

const delay = (milliseconds: number) => ({ "--delay": milliseconds }) as CSSProperties;

interface AuthSceneProps {
  events: readonly EarthEvent[];
  /** What the past day looked like, such as "43 earthquakes and 2 floods". */
  summary: string | null;
}

/**
 * The visual half of the sign in and sign up pages, on wide screens: the
 * planet as a live seismogram, as on the home page, with a line about what
 * HazardWatch does and what it saw in the past day.
 */
export function AuthScene({ events, summary }: AuthSceneProps) {
  return (
    <aside className="bg-ink relative isolate hidden min-h-dvh flex-col overflow-hidden border-r border-white/10 lg:flex">
      <SeismicEarth events={events} className="absolute inset-0 size-full text-stone-200" />
      {/* Keeps the text readable where it crosses the southern lines. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-[linear-gradient(to_top,var(--color-ink)_35%,transparent)]"
      />

      <div className="relative mt-auto max-w-xl p-12 xl:p-16">
        <p
          className="rise-in text-muted flex items-center gap-2.5 font-mono text-xs tracking-[0.2em] uppercase"
          style={delay(200)}
        >
          <span aria-hidden className="relative flex size-2">
            <span className="bg-accent absolute inline-flex size-full rounded-full opacity-60 motion-safe:animate-ping" />
            <span className="bg-accent relative inline-flex size-2 rounded-full" />
          </span>
          Live, updated every minute
        </p>
        <p
          className="rise-in mt-5 text-4xl leading-[1.1] font-light tracking-tight text-balance xl:text-5xl"
          style={delay(350)}
        >
          The places you care about, watched around the clock.
        </p>
        {summary && (
          <p className="rise-in text-muted mt-5 leading-relaxed text-pretty" style={delay(500)}>
            In the past 24 hours: <span className="text-neutral-200">{summary}</span>.
          </p>
        )}
      </div>
    </aside>
  );
}
