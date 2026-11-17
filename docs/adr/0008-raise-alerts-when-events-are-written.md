# 0008. Raise alerts when events are written

- Status: Accepted
- Date: 2026-11-17

## Context

Users want to know when a hazard reaches one of their watch zones, without
keeping the map open. Events arrive through the ingestion worker, and many
are revised after they first appear: an earthquake's magnitude is refined,
a cyclone's alert level rises.

Alerts could be computed in three places:

- **When the user opens the app.** Simple, but nothing can be sent while
  the user is away, which defeats the purpose.
- **In a separate job** that scans recent events against every zone. It
  needs its own schedule and a record of what it has already processed,
  and it adds a delay after each ingestion pass.
- **In the worker, right after events are written.** The worker already
  knows which events were inserted or revised in a pass.

Not every event deserves an alert. Small earthquakes happen many times a
day, and sources keep revising events that ended long ago.

## Decision

The worker raises alerts in the transaction that writes a batch of events.
The events inserted or revised in that batch are matched against every
watch zone, with the same condition as the zone pages (see
[ADR 0007](0007-define-watch-zones-as-circles-on-the-earths-surface.md)),
and an alert is recorded in `zone_alerts` when:

- the event's severity is at or above the zone's threshold. Each zone has
  one, `moderate` by default, or none to turn alerts off;
- the event is still going on, or ended less than a day ago.

There is one alert per zone and event, enforced by a unique index. When a
revision makes the event more severe, the alert is raised again and marked
unread; otherwise, writing the event again leaves the alert alone.

The web application lists alerts and tracks which ones the user has read.
It does not send them anywhere yet.

## Consequences

- An alert cannot be lost between writing an event and matching it, and no
  extra job or processing cursor is needed.
- The cost of matching grows with the events that changed, not with the
  whole table, and the geography index keeps each lookup fast.
- A zone created or widened after an event was stored does not alert about
  it until the source revises the event. Its page still shows the event.
- Delivery channels, such as email or webhooks, can be added later as
  consumers of `zone_alerts`, for instance by tracking when each alert was
  sent.
