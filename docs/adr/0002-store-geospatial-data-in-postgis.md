# 0002. Store hazard events in PostgreSQL with PostGIS

- Status: Accepted
- Date: 2026-11-16

## Context

The core features are spatial: showing events on a map, finding events
near a place and matching new events against user-defined watch zones.
These queries must stay fast as millions of events accumulate. The same
database also stores users, sessions and ingestion history, which are
relational.

## Decision

Use PostgreSQL with the PostGIS extension as the single datastore, and
access it through Drizzle ORM.

- Event positions are `geometry(Point, 4326)` columns with a GiST index.
- Fields common to every source are typed columns; source-specific data
  goes in a `jsonb` column.
- Drizzle defines the schema in TypeScript and generates SQL migrations
  that are reviewed and committed.

## Consequences

- Spatial predicates such as `ST_DWithin` and `ST_Intersects` run inside
  the database, next to the data, instead of in application code.
- One datastore to operate, back up and secure.
- Hosting must support the PostGIS extension, which rules out a few
  managed PostgreSQL offerings.
- drizzle-kit does not fully model PostGIS types, so generated migrations
  touching geometry columns must be checked by hand, for example to keep
  the SRID.
