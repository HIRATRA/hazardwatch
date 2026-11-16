# Architecture decision records

An architecture decision record (ADR) captures one significant technical
decision: the context at the time, the option chosen and its consequences.
Records are immutable once accepted. A decision that changes later gets a
new record that supersedes the old one.

| ADR                                                 | Title                                            | Status   |
| --------------------------------------------------- | ------------------------------------------------ | -------- |
| [0001](0001-use-a-pnpm-and-turborepo-monorepo.md)   | Use a pnpm and Turborepo monorepo                | Accepted |
| [0002](0002-store-geospatial-data-in-postgis.md)    | Store hazard events in PostgreSQL with PostGIS   | Accepted |
| [0003](0003-use-better-auth-for-authentication.md)  | Use Better Auth for authentication               | Accepted |
| [0004](0004-run-ingestion-in-a-dedicated-worker.md) | Run feed ingestion in a dedicated worker process | Accepted |

## Writing a new record

Copy the structure below into `NNNN-short-title.md`, using the next free
number, and add it to the table above in the same pull request as the
change it describes.

```md
# NNNN. Title

- Status: Proposed | Accepted | Superseded by [NNNN](NNNN-title.md)
- Date: YYYY-MM-DD

## Context

## Decision

## Consequences
```
