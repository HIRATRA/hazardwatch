# 0005. Render maps with MapLibre GL and OpenFreeMap tiles

- Status: Accepted
- Date: 2026-11-16

## Context

The live map is the centre of the product. It must display thousands of
events smoothly, style them from their data, and look consistent with the
dark interface. As an open-source project, HazardWatch should also run
from a fresh clone without creating an account or an API key with a map
provider.

The usual options each fall short on one of these points. Mapbox GL JS and
Google Maps require an access token and a billing account. Leaflet with
raster tiles is simple but renders large point sets in the DOM or on a 2D
canvas and cannot restyle the basemap.

## Decision

Render the map with MapLibre GL JS, the open-source fork of Mapbox GL JS,
on top of the OpenFreeMap dark vector style, built from OpenStreetMap data
and free to use without a key.

- Events are a single GeoJSON source drawn as circle layers. Colour, size
  and drawing order come from data-driven expressions on the severity.
- MapLibre is used directly through one client component instead of a
  React wrapper. The map instance is created once and updated
  imperatively, so React renders never rebuild the WebGL context.
- The component is loaded on demand and never rendered on the server.

## Consequences

- No API key, account or usage-based bill, for contributors or for the
  deployed app.
- The basemap depends on a free community service without a service level
  agreement. Its style URL is a single constant, so moving to self-hosted
  tiles or a commercial provider is a one-line change.
- WebGL is required. Browsers without it see the event list but no map.
- MapLibre 6 parses tiles in a separate worker module whose URL must be
  declared with `setWorkerUrl` so that the bundler emits it.
- OpenStreetMap and OpenFreeMap attribution must stay visible on the map.
