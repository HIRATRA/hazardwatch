import Image from "next/image";
import type { CSSProperties } from "react";

import {
  gibsImageUrl,
  goesEastLayer,
  latestImageTime,
  nightLightsLayer,
  nightLightsTime,
} from "@/lib/imagery";

/**
 * What HazardWatch does, in three tiles: the live globe over real clouds,
 * watch zones over city lights, and alerts. Both pictures come straight from
 * NASA, the clouds being the latest image of GOES-East, under an hour old.
 */
export function Features() {
  const clouds = gibsImageUrl(goesEastLayer, {
    bounds: [-55, -125, 55, -15],
    time: latestImageTime,
    width: 1100,
    height: 1100,
  });
  const lights = gibsImageUrl(nightLightsLayer, {
    bounds: [28, -12, 62, 44],
    time: nightLightsTime,
    width: 1120,
    height: 680,
  });

  return (
    <section className="mx-auto max-w-7xl px-6 pb-28 md:pb-40">
      <h2 className="reveal max-w-3xl text-3xl leading-[1.15] font-light tracking-tight text-balance md:text-5xl">
        From the whole planet to the places you watch.
      </h2>

      <div className="mt-14 grid gap-4 md:mt-20 md:grid-cols-5 md:grid-rows-2">
        <article className="reveal group relative isolate flex min-h-[28rem] flex-col justify-end overflow-hidden rounded-[1.75rem] border border-white/10 p-8 md:col-span-3 md:row-span-2 md:min-h-[40rem] md:p-10">
          <Image
            src={clouds}
            alt="Clouds over the Americas, seen by the GOES-East satellite less than an hour ago"
            fill
            unoptimized
            sizes="(min-width: 768px) 60vw, 100vw"
            className="-z-10 object-cover transition-transform duration-[2s] ease-out group-hover:scale-[1.03]"
          />
          <div
            aria-hidden
            className="from-ink via-ink/70 absolute inset-0 -z-10 bg-gradient-to-t to-transparent"
          />
          <h3 className="text-2xl font-light tracking-tight md:text-3xl">A live globe</h3>
          <p className="mt-3 max-w-md leading-relaxed text-neutral-300">
            Earthquakes, fires seen from orbit, cyclones and floods, over clouds imaged every ten
            minutes.
          </p>
        </article>

        <article className="reveal group relative isolate flex min-h-[22rem] flex-col justify-end overflow-hidden rounded-[1.75rem] border border-white/10 p-8 md:col-span-2">
          <Image
            src={lights}
            alt="Europe and the Mediterranean at night, lit by its cities"
            fill
            unoptimized
            sizes="(min-width: 768px) 40vw, 100vw"
            className="-z-10 object-cover transition-transform duration-[2s] ease-out group-hover:scale-[1.03]"
          />
          <div
            aria-hidden
            className="from-ink/90 absolute inset-0 -z-10 bg-gradient-to-t via-transparent to-transparent"
          />
          <h3 className="text-2xl font-light tracking-tight">Watch zones</h3>
          <p className="mt-3 max-w-sm leading-relaxed text-neutral-300">
            Draw a circle around a city, a site or a supplier, and follow the hazards inside it.
          </p>
        </article>

        <article className="reveal relative isolate flex min-h-[22rem] flex-col justify-end overflow-hidden rounded-[1.75rem] border border-white/10 bg-[radial-gradient(circle_at_75%_30%,color-mix(in_oklch,var(--color-accent)_22%,transparent),transparent_60%)] p-8 md:col-span-2">
          {/* Rings spreading from a point, like an alert going out. */}
          <div aria-hidden className="absolute top-[30%] right-[25%] -z-10 size-0">
            {[0, 1200, 2400].map((delay) => (
              <span
                key={delay}
                className="signal-ring border-accent/60 absolute -top-28 -left-28 size-56 rounded-full border"
                style={{ "--delay": delay } as CSSProperties}
              />
            ))}
            <span className="bg-accent absolute -top-1.5 -left-1.5 size-3 rounded-full" />
          </div>
          <h3 className="text-2xl font-light tracking-tight">Alerts</h3>
          <p className="mt-3 max-w-sm leading-relaxed text-neutral-300">
            In the app and by email, the moment an event reaches one of your zones, from the
            severity you choose.
          </p>
        </article>
      </div>
    </section>
  );
}
