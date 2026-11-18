import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { Fragment, type CSSProperties } from "react";

import { SeismicEarth, type EarthEvent } from "./seismic-earth";

const HEADLINE = "Every tremor, fire and storm, as it happens.";

/** Headline whose words slide up out of their line, one after the other. */
function RisingHeadline({ text }: { text: string }) {
  return (
    <h1 className="max-w-4xl text-[2.6rem] leading-[1.05] font-light tracking-tight text-balance sm:text-6xl xl:text-7xl">
      {text.split(" ").map((word, index) => (
        <Fragment key={index}>
          {/* Clipped with room for descenders, so that words rise from a baseline. */}
          <span className="rise-word inline-block overflow-hidden pb-[0.12em] align-top">
            <span style={{ "--index": index } as CSSProperties}>{word}</span>
          </span>{" "}
        </Fragment>
      ))}
    </h1>
  );
}

const delay = (milliseconds: number) => ({ "--delay": milliseconds }) as CSSProperties;

interface HeroProps {
  events: readonly EarthEvent[];
}

/** Full screen opening: the planet as a live seismogram, behind the promise. */
export function Hero({ events }: HeroProps) {
  return (
    <section className="bg-ink relative isolate flex min-h-[100dvh] flex-col overflow-hidden">
      <SeismicEarth events={events} className="absolute inset-0 size-full text-stone-200" />
      {/* Keeps the text readable where it crosses the southern lines. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-3/4 bg-[linear-gradient(to_top,var(--color-ink)_45%,transparent)] md:bg-[linear-gradient(100deg,var(--color-ink)_30%,transparent_68%)] md:[mask-image:linear-gradient(to_top,black_60%,transparent)]"
      />

      <div className="relative mx-auto mt-auto w-full max-w-7xl px-6 pt-32 pb-16 md:pb-24">
        <p
          className="rise-in text-muted flex items-center gap-2.5 font-mono text-xs tracking-[0.2em] uppercase"
          style={delay(0)}
        >
          <span aria-hidden className="relative flex size-2">
            <span className="bg-accent absolute inline-flex size-full rounded-full opacity-60 motion-safe:animate-ping" />
            <span className="bg-accent relative inline-flex size-2 rounded-full" />
          </span>
          Live from USGS, NASA and GDACS
        </p>
        <div className="mt-6">
          <RisingHeadline text={HEADLINE} />
        </div>
        <p
          className="rise-in text-muted mt-6 max-w-xl text-lg leading-relaxed text-pretty"
          style={delay(650)}
        >
          Earthquakes, wildfires, cyclones and floods from open data, mapped live, with alerts for
          the places you watch.
        </p>
        <div className="rise-in mt-10 flex flex-wrap items-center gap-3" style={delay(800)}>
          <Link
            href="/map"
            className="group bg-accent hover:bg-accent-strong focus-visible:ring-accent focus-visible:ring-offset-ink inline-flex items-center gap-2 rounded-full py-3 pr-5 pl-6 text-sm font-medium text-neutral-950 transition-[background-color,transform] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.98]"
          >
            Open the live map
            <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/sign-up"
            className="focus-visible:ring-accent rounded-full border border-white/15 px-6 py-3 text-sm font-medium text-neutral-100 transition-[background-color,border-color,transform] outline-none hover:border-white/30 hover:bg-white/5 focus-visible:ring-2 active:scale-[0.98]"
          >
            Get started
          </Link>
        </div>
      </div>
    </section>
  );
}
