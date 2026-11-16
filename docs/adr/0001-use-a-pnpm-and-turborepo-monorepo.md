# 0001. Use a pnpm and Turborepo monorepo

- Status: Accepted
- Date: 2026-11-16

## Context

HazardWatch ships at least two applications, a web app and an ingestion
worker, that must agree on the same database schema and types. Keeping
them in separate repositories would mean publishing the schema as a
package and coordinating releases for every schema change.

## Decision

Keep every application and shared library in one repository, managed with
pnpm workspaces and orchestrated with Turborepo.

- `apps/*` contains deployable applications.
- `packages/*` contains libraries consumed through `workspace:*`.
- Applications may depend on packages but never on each other.
- Turborepo runs `build`, `typecheck` and `test` in dependency order and
  caches their results.

## Consequences

- A schema change and the code that uses it land in the same pull request.
- pnpm's strict `node_modules` layout surfaces undeclared dependencies
  early.
- Shared packages are compiled before dependants can be type-checked, so
  tasks declare `dependsOn: ["^build"]`.
- Tooling (TypeScript, ESLint, Prettier, commit hooks) is configured once
  at the root.
