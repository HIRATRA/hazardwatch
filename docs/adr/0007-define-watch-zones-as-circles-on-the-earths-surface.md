# 0007. Define watch zones as circles on the Earth's surface

- Status: Accepted
- Date: 2026-11-17

## Context

Users watch the places they care about: a home, an office, a supplier. A
watch zone has to be quick to set up, and the question asked of it, which
events lie within it, has to be answered correctly anywhere on the globe,
including near the poles and across the antimeridian.

Events are points. USGS reports the epicentre of an earthquake and GDACS
the centroid of the area a disaster affects.

Three shapes were considered:

- **Polygons** drawn on the map fit any area, such as a coastline or a
  border, but need a drawing tool and are tedious to edit on a phone.
- **Administrative areas**, such as countries, need a boundary dataset and
  are too coarse for a single site.
- **Circles**, a centre and a radius, take one click and a choice of
  distance, and match how people think about proximity: "within 100 km of
  the office".

Distances computed on `geometry(Point, 4326)` are in degrees, which shrink
towards the poles and break across the antimeridian.

## Decision

A watch zone is a circle: a centre stored as `geometry(Point, 4326)` and a
radius in whole kilometres between 1 and 1,000, enforced by a check
constraint. An account can watch up to 20 zones.

An event lies within a zone when `ST_DWithin` on the geography type puts
its location within the radius of the centre. A GiST index on the event
location cast to geography serves these queries, from either side: the
events within one zone, or the zones that contain an event.

## Consequences

- Creating a zone takes a click on the map and a radius, with no drawing
  library.
- Matching is measured on the WGS 84 ellipsoid, so it is correct at any
  latitude and across the antimeridian.
- A zone cannot follow a coastline or a border. Polygons can be added
  later as another kind of zone, matched with `ST_Intersects` on the same
  index.
- An event matches through its reported point only. A cyclone whose
  centroid lies outside a zone does not match, even when the affected area
  overlaps it. GDACS publishes affected areas that could refine this.
- The map draws zones on a sphere while PostGIS measures on the ellipsoid.
  The difference is under 0.5%, so an event right at the edge may look
  slightly inside or outside the outline.
