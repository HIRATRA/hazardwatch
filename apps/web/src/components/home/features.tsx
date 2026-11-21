import type { CSSProperties } from "react";

import { Reveal, RevealTile, RevealWords } from "@/components/motion/reveal";
import type { MapEvent } from "@/lib/events/types";
import {
  gibsImageUrl,
  goesEastLayer,
  latestImageTime,
  nightLightsLayer,
  nightLightsTime,
  type Bounds,
} from "@/lib/imagery";

import { AlertFeed } from "./alert-feed";
import { EventPoints } from "./event-points";
import { pickAlerts, placeEvents, zoneEllipse, type SceneZone } from "./feature-scenes";
import { GeoPicture } from "./geo-picture";
import { Spotlight } from "./spotlight";

const tile =
  "group relative isolate flex flex-col justify-end overflow-hidden rounded-[1.75rem] border border-white/10 p-8";

/** The Americas, as seen by GOES-East. */
const AMERICAS: Bounds = [-55, -125, 55, -15];
/** Europe and the Mediterranean. */
const EUROPE: Bounds = [30, -18, 64, 38];

/** The zone drawn over Europe, as an example. */
const EXAMPLE_ZONE: SceneZone = { name: "Paris", latitude: 48.86, longitude: 2.35, radiusKm: 400 };

const aspectOf = ([south, west, north, east]: Bounds) => (east - west) / (north - south);

const numberFormat = new Intl.NumberFormat("en");

/** A small label floating over a picture, like a reading on an instrument. */
function Readout({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p
      className={`flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 font-mono text-[0.68rem] tracking-[0.14em] text-neutral-200 uppercase backdrop-blur-md ${className}`}
    >
      {children}
    </p>
  );
}

function LiveDot() {
  return (
    <span aria-hidden className="relative flex size-1.5">
      <span className="bg-accent absolute inline-flex size-full rounded-full opacity-70 motion-safe:animate-ping" />
      <span className="bg-accent relative inline-flex size-1.5 rounded-full" />
    </span>
  );
}

interface FeaturesProps {
  /** Events active in the past day. */
  events: readonly MapEvent[];
  now: Date;
}

/**
 * What HazardWatch does, in three tiles, each alive with the events of the
 * past day: the live globe, with events placed over the latest clouds of
 * GOES-East, under an hour old; a watch zone over city lights, swept like a
 * radar; and alerts arriving as notifications. Tiles rise like curtains,
 * their pictures drift as the page scrolls, and a light follows the pointer.
 */
export function Features({ events, now }: FeaturesProps) {
  const clouds = gibsImageUrl(goesEastLayer, {
    bounds: AMERICAS,
    time: latestImageTime,
    width: 1100,
    height: 1100,
  });
  const lights = gibsImageUrl(nightLightsLayer, {
    bounds: EUROPE,
    time: nightLightsTime,
    width: 1120,
    height: 680,
  });

  const americas = placeEvents(events, AMERICAS, { now, limit: 260 });
  const europe = placeEvents(events, EUROPE, { now, limit: 120, zone: EXAMPLE_ZONE });
  const ellipse = zoneEllipse(EXAMPLE_ZONE, EUROPE);
  const inZone = europe.filter((point) => point.inZone).length;
  const alerts = pickAlerts(events, 8);

  return (
    <section className="mx-auto max-w-7xl px-6 pb-28 md:pb-40">
      <RevealWords
        text="From the whole planet to the places you watch."
        className="max-w-3xl text-3xl leading-[1.15] font-light tracking-tight text-balance md:text-5xl"
      />

      <div className="mt-14 grid gap-4 md:mt-20 md:grid-cols-5 md:grid-rows-2">
        <RevealTile
          className={`${tile} min-h-[30rem] md:col-span-3 md:row-span-2 md:min-h-[44rem] md:p-10`}
        >
          <GeoPicture
            src={clouds}
            alt="Clouds over the Americas, seen by the GOES-East satellite less than an hour ago, with the events of the past day"
            sizes="(min-width: 768px) 60vw, 100vw"
            aspect={aspectOf(AMERICAS)}
            className="transition-transform duration-[2s] ease-out group-hover:scale-[1.04]"
          >
            <EventPoints points={americas} />
          </GeoPicture>
          {/* The satellite's scan, passing over the picture. */}
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <div className="scan-sweep absolute inset-x-0 top-0 h-1/4 motion-reduce:hidden" />
          </div>
          <div
            aria-hidden
            className="from-ink via-ink/60 pointer-events-none absolute inset-0 -z-10 bg-gradient-to-t via-25% to-transparent to-60%"
          />
          <Spotlight />

          <div className="absolute inset-x-6 top-6 flex flex-wrap items-center justify-between gap-2 md:inset-x-8 md:top-8">
            <Readout>
              <LiveDot />
              GOES-East · live
            </Readout>
            {americas.length > 0 && (
              <Readout>{numberFormat.format(americas.length)} events in view</Readout>
            )}
          </div>

          <Reveal delay={0.3}>
            <h3 className="text-2xl font-light tracking-tight md:text-4xl">A live globe</h3>
            <p className="mt-3 max-w-md leading-relaxed text-neutral-300">
              Earthquakes, fires seen from orbit, cyclones and floods, over clouds imaged every ten
              minutes.
            </p>
          </Reveal>
        </RevealTile>

        <RevealTile className={`${tile} min-h-[24rem] md:col-span-2`} delay={0.12}>
          <GeoPicture
            src={lights}
            alt="Europe and the Mediterranean at night, lit by its cities, with a watch zone around Paris"
            sizes="(min-width: 768px) 40vw, 100vw"
            aspect={aspectOf(EUROPE)}
            focus={{ x: ellipse.cx, y: 50 }}
            className="transition-transform duration-[2s] ease-out group-hover:scale-[1.04]"
          >
            <div
              aria-hidden
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${ellipse.cx}%`,
                top: `${ellipse.cy}%`,
                width: `${ellipse.rx * 2}%`,
                height: `${ellipse.ry * 2}%`,
              }}
            >
              <div className="bg-accent/[0.14] border-accent absolute inset-0 overflow-hidden rounded-[50%] border-2 shadow-[0_0_48px_color-mix(in_oklch,var(--color-accent)_55%,transparent)]">
                <div className="radar-sweep absolute top-1/2 left-1/2 aspect-square w-[160%] -translate-x-1/2 -translate-y-1/2" />
              </div>
              <div className="border-accent/50 absolute -inset-[22%] rounded-[50%] border border-dashed" />
              <span className="bg-accent absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_12px_var(--color-accent)]" />
            </div>
            <EventPoints points={europe} />
          </GeoPicture>
          <div
            aria-hidden
            className="from-ink/95 via-ink/40 pointer-events-none absolute inset-0 -z-10 bg-gradient-to-t to-transparent to-70%"
          />
          <Spotlight />

          <div className="absolute inset-x-6 top-6 flex justify-end">
            <Readout>
              {EXAMPLE_ZONE.name} · {EXAMPLE_ZONE.radiusKm} km
              {inZone > 0 && <span className="text-accent">· {inZone} inside</span>}
            </Readout>
          </div>

          <Reveal delay={0.4}>
            <h3 className="text-2xl font-light tracking-tight">Watch zones</h3>
            <p className="mt-3 max-w-sm leading-relaxed text-neutral-300">
              Draw a circle around a city, a site or a supplier, and follow the hazards inside it.
            </p>
          </Reveal>
        </RevealTile>

        <RevealTile
          className={`${tile} min-h-[24rem] bg-[radial-gradient(circle_at_75%_20%,color-mix(in_oklch,var(--color-accent)_22%,transparent),transparent_60%)] md:col-span-2`}
          delay={0.24}
        >
          {/* Rings spreading from a point, like an alert going out. */}
          <div aria-hidden className="absolute top-[22%] right-[22%] -z-10 size-0">
            {[0, 1200, 2400].map((delay) => (
              <span
                key={delay}
                className="signal-ring border-accent/50 absolute -top-32 -left-32 size-64 rounded-full border"
                style={{ "--delay": delay } as CSSProperties}
              />
            ))}
          </div>
          <Spotlight />

          <div className="absolute inset-x-6 top-6 md:inset-x-8">
            <AlertFeed alerts={alerts} now={now.toISOString()} />
          </div>

          <Reveal delay={0.5}>
            <h3 className="text-2xl font-light tracking-tight">Alerts</h3>
            <p className="mt-3 max-w-sm leading-relaxed text-neutral-300">
              In the app, by email and as notifications on your devices, the moment an event reaches
              one of your zones, from the severity you choose.
            </p>
          </Reveal>
        </RevealTile>
      </div>
    </section>
  );
}
