<p align="center">
  <img src="docs/assets/logo.svg" width="64" height="64" alt="HazardWatch logo" />
</p>

<h1 align="center">HazardWatch</h1>

<p align="center">
  Earthquakes, wildfires, cyclones and floods on a live globe, from open data,<br />
  with alerts when they reach the places you watch.
</p>

<p align="center">
  <a href="https://hazardwatch-bay.vercel.app"><strong>Open the live map</strong></a>
  &nbsp;·&nbsp;
  <a href="docs/architecture.md">Architecture</a>
  &nbsp;·&nbsp;
  <a href="docs/deployment.md">Deploy your own</a>
</p>

<p align="center">
  <a href="https://github.com/HIRATRA/hazardwatch/actions/workflows/ci.yml"><img src="https://github.com/HIRATRA/hazardwatch/actions/workflows/ci.yml/badge.svg" alt="CI status" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-f97c3d?style=flat-square" alt="MIT license" /></a>
  <img src="https://img.shields.io/badge/runs_on-free_tiers-0c1014?style=flat-square" alt="Runs on free tiers" />
  <img src="https://img.shields.io/badge/API_keys-none-0c1014?style=flat-square" alt="No API key needed" />
</p>

<p align="center">
  <img src="docs/screenshots/home.jpg" alt="The HazardWatch home page: the planet drawn as a seismogram, one line per band of latitude, raised over land, with a peak at every event of the past day" />
</p>

## What it does

HazardWatch follows natural hazards around the world as they happen. A
worker polls public feeds every few minutes, turns their very different
formats into a single kind of event and stores them in PostGIS. The web app
shows them on a 3D globe, over live satellite imagery if you like, and lets
you draw watch zones around the places you care about: an office, a
supplier, a family's town. When an event reaches one of them, you get an
alert in the app, by email and as a notification on your devices.

Everything runs on public data and free hosting tiers, without a single API
key.

### A live globe of every hazard

<img src="docs/screenshots/live-map.jpg" alt="The live map: a globe with clusters of events coloured by severity, the heat of fires across the Sahel, and the list of events beside it" />

- **Every source on one map.** Earthquakes from USGS, fires detected from
  orbit by NASA FIRMS, cyclones, floods, volcanoes and droughts from GDACS,
  refreshed every minute.
- **Readable at any zoom.** Events merge into clusters coloured by their
  most severe event, fires glow as a heatmap, and events that started in
  the past six hours pulse.
- **Every event seen from orbit.** Its card shows the area around it as
  NOAA-20 pictured it on its last day of activity, with fires in red, and
  steps back and forth in days.
- **Shareable views.** Filters by type, period and severity live in the URL,
  so any view can be bookmarked or sent.

### The planet seen from orbit

The basemap switches to NASA imagery, fetched by the browser straight from
NASA GIBS.

<table>
  <tr>
    <td valign="top" width="33%"><img src="docs/screenshots/basemap-satellite.jpg" alt="Satellite basemap: Tropical Cyclone Akvan over the Bay of Bengal, in true colour" /></td>
    <td valign="top" width="33%"><img src="docs/screenshots/basemap-live.jpg" alt="Live clouds basemap: clouds over the western United States, imaged by GOES less than an hour earlier" /></td>
    <td valign="top" width="33%"><img src="docs/screenshots/basemap-night.jpg" alt="Night lights basemap: the cities of Japan, Korea and China at night" /></td>
  </tr>
  <tr>
    <td valign="top"><strong>Satellite</strong><br />True colour of the last complete day, here Tropical Cyclone Akvan over the Bay of Bengal.</td>
    <td valign="top"><strong>Live clouds</strong><br />A new image every ten minutes from the GOES satellites, over the Americas and the Pacific.</td>
    <td valign="top"><strong>Night lights</strong><br />The Black Marble composite of city lights, here around the Sea of Japan.</td>
  </tr>
</table>

### Watch zones and alerts

<img src="docs/screenshots/zone.jpg" alt="A watch zone page: a 500 km circle around Bangui with the fires detected inside it, and their list" />

A watch zone is a circle of 10 to 1,000 km around any point, drawn on the
map or typed in. Its page shows the hazards inside it. When a new event
reaches a zone at or above the severity chosen for it, an alert appears in
the app and, once the address is confirmed, in a digest email. Turn
notifications on from the alerts page, and each device you choose gets
them within a minute, phones included once the app is installed.

<table>
  <tr>
    <td valign="top" width="58%"><img src="docs/screenshots/alerts.jpg" alt="The alerts page, listing two fires that reached a watch zone" /></td>
    <td valign="top" width="42%"><img src="docs/screenshots/email.jpg" alt="The alert email: two events reached your watch zones, with a link to all alerts" /></td>
  </tr>
  <tr>
    <td valign="top"><strong>In the app</strong>, with an unread count in the header.</td>
    <td valign="top"><strong>By email</strong>, in one digest every two minutes at most.</td>
  </tr>
</table>

### On any screen

<p align="center">
  <img src="docs/screenshots/mobile-home.jpg" width="260" alt="The home page on a phone" />
  &nbsp;&nbsp;&nbsp;
  <img src="docs/screenshots/mobile-map.jpg" width="260" alt="The live map on a phone, with the globe above the list of events" />
</p>

## How it works

```mermaid
flowchart LR
    subgraph feeds ["Open data feeds"]
        usgs["USGS<br/>earthquakes"]
        firms["NASA FIRMS<br/>fires from orbit"]
        gdacs["GDACS<br/>cyclones, floods,<br/>volcanoes, droughts"]
    end

    worker["Worker<br/>Node.js on Render"]
    db[("PostgreSQL + PostGIS<br/>on Neon")]
    web["Web app<br/>Next.js on Vercel"]
    smtp["SMTP<br/>alert emails"]
    push["Browser push services<br/>notifications"]
    browser(("Browser"))
    gibs["NASA GIBS<br/>satellite imagery"]
    tiles["OpenFreeMap<br/>vector tiles"]

    usgs & firms & gdacs -- "polled every 1 to 30 min" --> worker
    worker -- "upserts events,<br/>raises zone alerts" --> db
    worker -- "digests" --> smtp
    worker -- "notifications" --> push
    push --> browser
    web -- "events, zones, alerts" --> db
    browser --> web
    browser -- "basemap" --> tiles
    browser -- "imagery" --> gibs
```

1. **Ingestion.** The worker polls each feed on its own interval and maps
   it to one event model: a kind, a severity, a location and a period of
   activity. Satellite fire detections, about 100,000 a day, are grouped
   into fires by cells of 0.25°.
2. **Alerts.** In the same transaction that writes the events, a single
   PostGIS query matches them against every watch zone, on the surface of
   the Earth, and raises the alerts that pass each zone's threshold.
3. **Email and push.** Every two minutes, the worker claims the alerts
   waiting for an email and sends each confirmed user one digest. Every
   minute, it pushes the new ones to the browsers that turned
   notifications on, through the Web Push protocol.
4. **Web.** Pages are React Server Components reading the database. The
   map runs MapLibre in the browser, which also loads the imagery from NASA
   directly, so the server never proxies a tile.

The reasoning behind each choice is recorded in
[architecture decision records](docs/adr/README.md), such as
[modelling events as activity periods](docs/adr/0006-model-hazard-events-as-activity-periods.md),
[raising alerts when events are written](docs/adr/0008-raise-alerts-when-events-are-written.md)
or [grouping fire detections into grid cells](docs/adr/0011-group-satellite-fire-detections-into-grid-cells.md).

## Tech stack

| Layer        | Technologies                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Frontend** | ![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=flat-square&logo=nextdotjs&logoColor=white) ![React](https://img.shields.io/badge/React_19-20232a?style=flat-square&logo=react&logoColor=61dafb) ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_4-0b1120?style=flat-square&logo=tailwindcss&logoColor=38bdf8) ![Motion](https://img.shields.io/badge/Motion-111111?style=flat-square&logo=framer&logoColor=white) ![Radix](https://img.shields.io/badge/Radix_UI-161618?style=flat-square&logo=radixui&logoColor=white) ![Lenis](https://img.shields.io/badge/Lenis-111111?style=flat-square) |
| **Maps**     | ![MapLibre](https://img.shields.io/badge/MapLibre_GL_6-396cb2?style=flat-square&logo=maplibre&logoColor=white) ![OpenStreetMap](https://img.shields.io/badge/OpenFreeMap-7ebc6f?style=flat-square&logo=openstreetmap&logoColor=white) ![NASA](https://img.shields.io/badge/NASA_GIBS-0b3d91?style=flat-square&logo=nasa&logoColor=white)                                                                                                                                                                                                                                                                                 |
| **Backend**  | ![Node.js](https://img.shields.io/badge/Node.js_22-5fa04e?style=flat-square&logo=nodedotjs&logoColor=white) ![Better Auth](https://img.shields.io/badge/Better_Auth-000000?style=flat-square&logo=betterauth&logoColor=white) ![Zod](https://img.shields.io/badge/Zod_4-3068b7?style=flat-square&logo=zod&logoColor=white) ![pino](https://img.shields.io/badge/pino-687634?style=flat-square&logo=pino&logoColor=white)                                                                                                                                                                                                 |
| **Data**     | ![PostgreSQL](https://img.shields.io/badge/PostgreSQL_17-4169e1?style=flat-square&logo=postgresql&logoColor=white) ![PostGIS](https://img.shields.io/badge/PostGIS-2c5aa0?style=flat-square) ![Drizzle](https://img.shields.io/badge/Drizzle_ORM-0c0c0c?style=flat-square&logo=drizzle&logoColor=c5f74f)                                                                                                                                                                                                                                                                                                                 |
| **Quality**  | ![TypeScript](https://img.shields.io/badge/TypeScript_6-3178c6?style=flat-square&logo=typescript&logoColor=white) ![Vitest](https://img.shields.io/badge/Vitest-1b1b1f?style=flat-square&logo=vitest&logoColor=fcc72b) ![ESLint](https://img.shields.io/badge/ESLint-4b32c3?style=flat-square&logo=eslint&logoColor=white) ![Prettier](https://img.shields.io/badge/Prettier-1a2b34?style=flat-square&logo=prettier&logoColor=f7b93e) ![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088ff?style=flat-square&logo=githubactions&logoColor=white)                                                         |
| **Tooling**  | ![pnpm](https://img.shields.io/badge/pnpm_10-1f1f1f?style=flat-square&logo=pnpm&logoColor=f69220) ![Turborepo](https://img.shields.io/badge/Turborepo-000000?style=flat-square&logo=turborepo&logoColor=white) ![Docker](https://img.shields.io/badge/Docker-1d63ed?style=flat-square&logo=docker&logoColor=white) ![commitlint](https://img.shields.io/badge/commitlint-000000?style=flat-square&logo=commitlint&logoColor=white)                                                                                                                                                                                       |
| **Hosting**  | ![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white) ![Render](https://img.shields.io/badge/Render-000000?style=flat-square&logo=render&logoColor=white) ![Neon](https://img.shields.io/badge/Neon-0f0f0f?style=flat-square&logo=neon&logoColor=00e599)                                                                                                                                                                                                                                                                                                                   |

A few things worth knowing about how they fit together:

- **One TypeScript monorepo**, with pnpm workspaces and Turborepo: two apps
  and two shared packages, type-checked and linted together.
- **Geospatial work happens in the database.** Events and zones are PostGIS
  geographies, so "is this event within 250 km of that point" is one
  indexed query, measured on the Earth rather than on a flat map.
- **No map provider account.** Vector tiles come from OpenFreeMap and
  imagery from NASA, both free and keyless.
- **Free to run.** Vercel hosts the web app, Render the worker, kept awake
  by an uptime monitor, and Neon the database.

## Data sources

| Source                                                  | What it provides                                                     | Polled           |
| ------------------------------------------------------- | -------------------------------------------------------------------- | ---------------- |
| [USGS](https://earthquake.usgs.gov/earthquakes/feed/)   | Earthquakes worldwide                                                | Every minute     |
| [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/)     | Fires detected by the VIIRS instruments of NOAA-20 and NOAA-21       | Every 30 minutes |
| [GDACS](https://www.gdacs.org/)                         | Tropical cyclones, floods, volcanoes and droughts, with their impact | Every 10 minutes |
| [NASA GIBS](https://nasa-gibs.github.io/gibs-api-docs/) | Satellite imagery: true colour, live clouds and city lights          | By the browser   |
| [OpenFreeMap](https://openfreemap.org/)                 | Vector tiles built from OpenStreetMap                                | By the browser   |

Data may be delayed or incomplete. HazardWatch is not meant for emergency
response.

## Getting started

You need Node.js 22.12 or later, pnpm 10 and Docker.

```sh
pnpm install
cp .env.example .env    # then set BETTER_AUTH_SECRET
docker compose up -d    # PostgreSQL with PostGIS on port 5433, Mailpit on 1025
pnpm db:migrate
pnpm dev                # web app and worker
```

The web app runs on <http://localhost:3000>. Generate a secret with
`openssl rand -base64 32`. Emails sent in development never leave your
machine: Mailpit catches them and shows them on <http://localhost:8025>.

| Command                 | What it does                                    |
| ----------------------- | ----------------------------------------------- |
| `pnpm dev`              | Starts the web app and the worker in watch mode |
| `pnpm test`             | Runs the unit tests                             |
| `pnpm test:integration` | Runs the tests against a real PostGIS database  |
| `pnpm lint`             | Lints every workspace                           |
| `pnpm typecheck`        | Type-checks every workspace                     |
| `pnpm build`            | Builds everything, as the CI does               |

## Project structure

```
apps/
  web/          Next.js app: pages, authentication, server actions, the globe
  worker/       Polls the hazard feeds, raises alerts and sends their emails
packages/
  db/           Drizzle schema, PostGIS queries and migrations
  email/        Email templates and sending
docs/
  architecture.md
  deployment.md
  adr/          Architecture decision records
```

## Documentation

- [Architecture](docs/architecture.md): the moving parts, how data flows
  between them and the principles behind the code.
- [Deployment](docs/deployment.md): setting up Neon, Vercel and Render, all
  on free tiers.
- [Decision records](docs/adr/README.md): why PostGIS, Better Auth, a
  dedicated worker, MapLibre, the globe and more.
- [Contributing](CONTRIBUTING.md): workflow, branch names and commit
  conventions.

## Credits

Designed & Built by [Hiratra Danarson](https://github.com/HIRATRA).

Events from [USGS](https://www.usgs.gov/), [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/)
and [GDACS](https://www.gdacs.org/). Imagery from NASA's Global Imagery
Browse Services (GIBS), part of NASA's Earth Science Data and Information
System (ESDIS). Maps from [OpenFreeMap](https://openfreemap.org/) and
OpenStreetMap contributors. Land outlines from
[Natural Earth](https://www.naturalearthdata.com/).

## License

[MIT](LICENSE)
