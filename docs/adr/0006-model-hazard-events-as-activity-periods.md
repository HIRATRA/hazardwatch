# 0006. Model hazard events as activity periods

- Status: Accepted
- Date: 2026-11-17

## Context

Earthquakes happen at a single instant, but most hazards do not. GDACS
reports floods that last weeks, droughts that last years and cyclones that
are reassessed every few hours. The map asks one question of every event:
was it active during the selected period?

The start time alone cannot answer it. Filtering on it hides a flood that
began a month ago and is still going on, which is exactly the kind of event
a monitoring tool must show.

A nullable end time, where null means "still in progress", reads naturally
but relies on the source to close every event. An event that the source
stops updating without closing it would stay open forever. Instantaneous
events would also need a special case.

## Decision

Every event carries a non-null `active_until` timestamp next to
`occurred_at`:

- For instantaneous events, it equals `occurred_at`.
- For lasting events, it is the end of the period the source last
  reported. It moves forward with each update, and may lie in the future
  when the source issues a forecast.

An event is active during a window when `active_until` falls after the
start of that window. Lists are ordered by `active_until`, most recently
active first, and a B-tree index on the column serves both. Whether the
source considers the event ongoing is kept in its `properties`.

## Consequences

- Ongoing events appear in every window that overlaps them, however long
  ago they started.
- An event the source stops updating ages out of the map on its own.
- Every source adapter must set `active_until`, even if only to the start
  time.
- Forecast periods, such as GloFAS flood forecasts relayed by GDACS, rank
  ahead of events that have ended.
- The migration that introduced the column backfilled existing rows from
  `occurred_at`, since every source at the time was instantaneous.
