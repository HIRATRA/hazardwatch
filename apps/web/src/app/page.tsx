const features = [
  {
    title: "Live hazard map",
    body: "Wildfires, earthquakes, tropical cyclones and floods from open data feeds, refreshed continuously.",
  },
  {
    title: "Watch zones",
    body: "Draw the areas that matter to you: sites, cities, supply routes, client portfolios.",
  },
  {
    title: "Instant alerts",
    body: "Get notified by email or webhook as soon as an event intersects one of your zones.",
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col px-6">
      <header className="flex items-center justify-between py-6">
        <span className="font-mono text-sm font-semibold tracking-widest uppercase">
          HazardWatch
        </span>
      </header>

      <section className="flex flex-1 flex-col justify-center py-24">
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
      </section>

      <footer className="border-border text-muted border-t py-6 text-xs">
        Data may be delayed or incomplete. Do not use for emergency response.
      </footer>
    </main>
  );
}
