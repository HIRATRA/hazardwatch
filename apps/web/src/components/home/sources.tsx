import { ArrowUpRightIcon } from "@phosphor-icons/react/dist/ssr";

import { DrawLine, Reveal, RevealWords } from "@/components/motion/reveal";

const sources = [
  {
    name: "USGS",
    cadence: "Every minute",
    body: "Earthquakes worldwide, from the United States Geological Survey.",
  },
  {
    name: "NASA FIRMS",
    cadence: "Every 30 minutes",
    body: "Fires detected from orbit by the VIIRS instruments of NOAA-20 and NOAA-21.",
  },
  {
    name: "GDACS",
    cadence: "Every 10 minutes",
    body: "Tropical cyclones, floods, volcanoes and droughts, with their expected impact.",
  },
  {
    name: "NASA GIBS",
    cadence: "Every 10 minutes",
    body: "Satellite imagery for the globe: true colour, live clouds and city lights.",
  },
];

/** Where the data comes from, and the code behind it. */
export function Sources() {
  return (
    <section className="border-t border-white/10">
      <div className="mx-auto max-w-7xl px-6 py-28 md:py-36">
        <RevealWords
          text="Every event comes from a public source."
          className="max-w-2xl text-3xl leading-[1.15] font-light tracking-tight text-balance md:text-5xl"
        />

        <dl className="mt-16 grid gap-x-12 gap-y-12 sm:grid-cols-2 lg:mt-20 lg:grid-cols-4">
          {sources.map((source, index) => (
            <div key={source.name}>
              <DrawLine delay={index * 0.12} />
              <Reveal delay={0.2 + index * 0.12} y={20} className="pt-6">
                <dt className="text-xl font-light text-neutral-50">{source.name}</dt>
                <dd className="text-accent mt-2 font-mono text-xs">{source.cadence}</dd>
                <dd className="text-muted mt-4 text-sm leading-relaxed">{source.body}</dd>
              </Reveal>
            </div>
          ))}
        </dl>

        <Reveal delay={0.2} className="mt-16">
          <a
            href="https://github.com/HIRATRA/hazardwatch"
            className="group inline-flex items-center gap-2 text-sm text-neutral-100 underline decoration-white/25 underline-offset-4 transition-colors hover:decoration-current"
          >
            HazardWatch is open source. Read the code on GitHub
            <ArrowUpRightIcon className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        </Reveal>
      </div>
    </section>
  );
}
