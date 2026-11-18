# 0012. Show the map as a globe with NASA imagery

- Status: Accepted
- Date: 2026-11-18

## Context

The live map was a flat Mercator map on a dark vector style. Hazards are
global, and a flat map inflates high latitudes and cuts the Pacific, where
many cyclones and earthquakes happen, at its edges. Markers alone also say
little about what is going on: the clouds of a cyclone or the smoke of a
fire are visible from space.

Imagery has to follow [ADR 0005](0005-render-maps-with-maplibre-and-openfreemap.md):
free, and without an account or an API key. NASA GIBS (Global Imagery
Browse Services) serves the imagery of many satellites as Web Mercator
tiles, without a key and to any website. What it offers shapes the
options:

- Daily true colour images, from instruments such as VIIRS on NOAA-20.
  A day fills in as the satellite goes round the planet, and passes that
  are missing are sometimes only filled the next day.
- Images every ten minutes from the geostationary GOES-East and GOES-West
  satellites, in GeoColor: true colour by day and infrared clouds over city
  lights by night. Together they see the Americas and the Pacific. GIBS has
  no such layer for Europe, Africa or the Indian Ocean, and only single
  bands from the Japanese Himawari satellite.
- GIBS replaces the time `default` in a tile URL with the time of the
  latest image, which it sends back in a `Layer-Time-Actual` header. It
  announces an image as the latest a few minutes before it serves all its
  tiles at that time.

## Decision

- The map uses the globe projection of MapLibre, with an atmosphere that
  fades out as the map zooms in and the globe turns into a flat map. It
  opens at the zoom where the whole globe fits the map.
- A picker on the map offers four basemaps:

  | Basemap      | Imagery                                                                     |
  | ------------ | --------------------------------------------------------------------------- |
  | Map          | None, the dark vector style alone. The default.                             |
  | Satellite    | VIIRS true colour of the last day, once 30 hours have passed since it ended |
  | Live clouds  | GOES-East and GOES-West GeoColor, the image before the latest               |
  | Night lights | The Black Marble composite of city lights, 2016                             |

- While Live clouds is shown, the browser reads the time of the latest
  image of each satellite every five minutes, with a HEAD request on one
  tile, and moves its tiles to the image before it. All the tiles of a
  satellite then show the same image, and the picker says when it was
  taken.
- Imagery is drawn over land, water and roads, below borders, place names,
  watch zones and events.
- The browser remembers the chosen basemap, without an account.

## Consequences

- Still no key and no bill. The imagery depends on NASA keeping GIBS
  online, without a service level agreement. GIBS and the satellites are
  credited on the map while their imagery shows.
- Satellite imagery is two days old, and live clouds about an hour old.
  Live clouds leave the rest of the world on the dark map.
- Imagery is coarse up close: about 300 m per pixel for true colour and
  1 km for GOES. Beyond that, tiles are scaled up.
- GIBS tells browsers not to store its tiles, so each visit downloads
  them again.
- Zone pages and the zone picker show the same globe, which looks flat at
  the zoom levels zones are drawn at.
