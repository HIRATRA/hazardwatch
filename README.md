# HazardWatch

Real-time natural hazard monitoring. HazardWatch aggregates open data on
wildfires, earthquakes, tropical cyclones and floods, plots it on an
interactive map, and alerts you when an event hits an area you care about.

> Early development. Expect breaking changes.

## Status

| Capability                                                       | State   |
| ---------------------------------------------------------------- | ------- |
| Accounts with email and password                                 | Done    |
| PostGIS event store and ingestion pipeline                       | Done    |
| USGS earthquake feed                                             | Done    |
| GDACS alerts for cyclones, floods, volcanoes, droughts and fires | Done    |
| NASA FIRMS satellite fire detections                             | Done    |
| Interactive map with filters                                     | Done    |
| Globe with satellite, live cloud and night light imagery         | Done    |
| Watch zones                                                      | Done    |
| Alerts when an event reaches a watch zone                        | Done    |
| Alerts delivered by email                                        | Done    |
| Assistant that summarises the situation nearby                   | Planned |

## Tech stack

- **Web:** Next.js 16 (App Router), React 19, Tailwind CSS 4, Motion and Lenis for
  animation and smooth scrolling
- **Maps:** MapLibre GL globe with OpenFreeMap vector tiles and NASA GIBS
  satellite imagery, no API key needed
- **Authentication:** Better Auth
- **Data:** PostgreSQL 17 with PostGIS, Drizzle ORM
- **Ingestion:** Node.js worker with pino logging
- **Tooling:** TypeScript, pnpm workspaces, Turborepo, ESLint, Prettier,
  Vitest, Conventional Commits

## Getting started

You need Node.js 22.12 or later, pnpm 10 and Docker.

```sh
pnpm install
cp .env.example .env    # then set BETTER_AUTH_SECRET
docker compose up -d    # PostgreSQL with PostGIS on port 5433, Mailpit on 1025
pnpm db:migrate
pnpm dev
```

The web app runs on <http://localhost:3000>. Generate a secret with
`openssl rand -base64 32`. Emails sent in development never leave your
machine: Mailpit catches them and shows them on <http://localhost:8025>.

## Deployment

The web app runs on Vercel, the worker on Render and the database on Neon.
[docs/deployment.md](docs/deployment.md) walks through the setup.

## Project structure

```
apps/
  web/       Next.js application: pages, authentication, API routes
  worker/    Ingestion worker that polls hazard feeds
packages/
  db/        Drizzle schema, database client and migrations
  email/     Email sending and templates
docs/
  architecture.md
  adr/       Architecture decision records
```

See [docs/architecture.md](docs/architecture.md) for how the pieces fit
together and [docs/adr](docs/adr/README.md) for the reasoning behind the main
technical choices.

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) for the
development workflow, branch naming and commit conventions.

## License

[MIT](LICENSE)
