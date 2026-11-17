import Link from "next/link";

import { GuestActions, SiteHeader } from "@/components/layout/site-header";

const features = [
  {
    title: "Live hazard map",
    body: "Wildfires, earthquakes, tropical cyclones and floods from open data feeds, refreshed continuously.",
  },
  {
    title: "Watch zones",
    body: "Pick the places that matter to you, such as sites, cities or suppliers, and follow the hazards around them.",
  },
  {
    title: "Instant alerts",
    body: "Get an alert as soon as an event reaches one of your zones, from the severity you choose.",
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader>
        <GuestActions />
      </SiteHeader>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 py-24">
        <p className="text-accent font-mono text-xs tracking-widest uppercase">
          Open-source hazard intelligence
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
          Know when disaster strikes near what matters to you.
        </h1>
        <p className="text-muted mt-6 max-w-2xl text-lg text-pretty">
          HazardWatch aggregates public data on natural hazards worldwide, plots it on a live map,
          and alerts you the moment an event reaches your watch zones.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/map"
            className="bg-accent hover:bg-accent-strong rounded-md px-4 py-2 text-sm font-medium text-neutral-950"
          >
            Open the live map
          </Link>
          <Link
            href="/sign-up"
            className="border-border hover:bg-surface-raised rounded-md border px-4 py-2 text-sm font-medium"
          >
            Create an account
          </Link>
        </div>

        <ul className="mt-16 grid gap-4 sm:grid-cols-3">
          {features.map((feature) => (
            <li
              key={feature.title}
              className="border-border bg-surface-raised rounded-lg border p-5"
            >
              <h2 className="font-medium">{feature.title}</h2>
              <p className="text-muted mt-2 text-sm">{feature.body}</p>
            </li>
          ))}
        </ul>
      </main>

      <footer className="border-border text-muted border-t">
        <p className="mx-auto max-w-5xl px-6 py-6 text-xs">
          Data may be delayed or incomplete. Do not use for emergency response.
        </p>
      </footer>
    </div>
  );
}
