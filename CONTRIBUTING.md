# Contributing to HazardWatch

Thanks for taking the time to contribute. This guide covers how the
repository is organised and the conventions every change is expected to
follow.

## Prerequisites

- Node.js 22.12 or later (see `.nvmrc`)
- pnpm 10 (`corepack enable` picks the pinned version automatically)
- Docker, for the local PostgreSQL/PostGIS database

## Getting started

```sh
corepack enable
pnpm install
cp .env.example .env
docker compose up -d
pnpm db:migrate
pnpm dev
```

## Repository layout

| Path          | Purpose                                                |
| ------------- | ------------------------------------------------------ |
| `apps/web`    | Next.js application: map, dashboard, authentication    |
| `apps/worker` | Ingestion worker that pulls hazard feeds on a schedule |
| `packages/db` | Drizzle schema, database client and migrations         |
| `docs`        | Architecture overview and decision records             |

Read [docs/architecture.md](docs/architecture.md) before making structural
changes. Significant technical decisions are recorded in
[docs/adr](docs/adr/README.md); a change that revisits one of them should
come with a new record that supersedes it.

## Branching model

`main` is always releasable and only receives changes through pull requests.

Create short-lived branches from `main` and name them after the type of
change:

- `feat/<short-description>` for new functionality
- `fix/<short-description>` for bug fixes
- `chore/<short-description>`, `docs/…`, `refactor/…`, `ci/…`, `test/…`

Keep branches focused on a single concern and rebase on `main` before
opening a pull request.

## Commit messages

Commits follow [Conventional Commits](https://www.conventionalcommits.org/)
and are checked by commitlint on every commit.

```
<type>(<optional scope>): <imperative summary, lower case, no period>

<optional body explaining what and why, wrapped at 72 columns>
```

Allowed scopes: `web`, `worker`, `db`, `auth`, `ui`, `deps`, `github`,
`release`.

Examples:

```
feat(worker): ingest USGS earthquake feed
fix(web): keep map bounds when switching layers
docs: document local database setup
```

Each commit should build, pass lint and leave the test suite green.

## Before opening a pull request

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Fill in the pull request template, link the related issue and describe how
the change was tested. Pull requests are squash-merged or merged with a
merge commit depending on whether the individual commits are meaningful on
their own.

## Database changes

Edit the schema in `packages/db/src/schema`, then generate a migration:

```sh
pnpm db:generate
```

Commit the generated SQL together with the schema change. Never edit a
migration that has already been merged.
