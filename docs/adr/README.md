# Architecture decision records

An architecture decision record (ADR) captures one significant technical
decision: the context at the time, the option chosen and its consequences.
Records are immutable once accepted. A decision that changes later gets a
new record that supersedes the old one.

| ADR                                                                 | Title                                                | Status   |
| ------------------------------------------------------------------- | ---------------------------------------------------- | -------- |
| [0001](0001-use-a-pnpm-and-turborepo-monorepo.md)                   | Use a pnpm and Turborepo monorepo                    | Accepted |
| [0002](0002-store-geospatial-data-in-postgis.md)                    | Store hazard events in PostgreSQL with PostGIS       | Accepted |
| [0003](0003-use-better-auth-for-authentication.md)                  | Use Better Auth for authentication                   | Accepted |
| [0004](0004-run-ingestion-in-a-dedicated-worker.md)                 | Run feed ingestion in a dedicated worker process     | Accepted |
| [0005](0005-render-maps-with-maplibre-and-openfreemap.md)           | Render maps with MapLibre GL and OpenFreeMap tiles   | Accepted |
| [0006](0006-model-hazard-events-as-activity-periods.md)             | Model hazard events as activity periods              | Accepted |
| [0007](0007-define-watch-zones-as-circles-on-the-earths-surface.md) | Define watch zones as circles on the Earth's surface | Accepted |
| [0008](0008-raise-alerts-when-events-are-written.md)                | Raise alerts when events are written                 | Accepted |
| [0009](0009-email-alerts-to-confirmed-addresses-from-the-worker.md) | Email alerts to confirmed addresses from the worker  | Accepted |
| [0010](0010-run-the-worker-as-a-free-render-web-service.md)         | Run the worker as a free Render web service          | Accepted |
| [0011](0011-group-satellite-fire-detections-into-grid-cells.md)     | Group satellite fire detections into grid cells      | Accepted |
| [0012](0012-show-the-map-as-a-globe-with-nasa-imagery.md)           | Show the map as a globe with NASA imagery            | Accepted |
| [0013](0013-push-alerts-with-web-push-from-the-worker.md)           | Push alerts with Web Push from the worker            | Accepted |

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
