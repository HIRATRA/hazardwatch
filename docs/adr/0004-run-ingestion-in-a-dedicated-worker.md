# 0004. Run feed ingestion in a dedicated worker process

- Status: Accepted
- Date: 2026-11-16

## Context

Hazard feeds have to be polled continuously, at intervals that vary per
source, and some payloads are large. Running ingestion inside the web
application, for example as scheduled route handlers, would tie it to
request timeouts and serverless execution limits, and a slow feed would
compete with user traffic.

## Decision

Run ingestion in `apps/worker`, a long-running Node.js process that is
deployed separately from the web application.

- Each source is an adapter with its own polling interval.
- Runs for a given source never overlap.
- Every run is recorded in `ingestion_runs`, and failures are stored
  rather than thrown.
- The worker and the web app communicate only through the database.

## Consequences

- Ingestion scales and fails independently of the web application.
- Polling state is kept in memory, so the worker must run as a single
  instance until leader election or a job queue is introduced.
- One more process to deploy and monitor; `ingestion_runs` provides the
  data for that monitoring.
