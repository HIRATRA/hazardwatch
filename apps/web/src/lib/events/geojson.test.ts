import { describe, expect, it } from "vitest";

import { isRecent, toFeatureCollection } from "./geojson";
import type { MapEvent } from "./types";

const event: MapEvent = {
  id: "5f0c1d3e-0000-4000-8000-000000000001",
  source: "usgs",
  kind: "earthquake",
  severity: "moderate",
  title: "M 5.4 - 95 km WSW of Changuillo, Peru",
  url: "https://earthquake.usgs.gov/earthquakes/eventpage/us7000tykh",
  occurredAt: "2026-11-16T16:16:45.265Z",
  activeUntil: "2026-11-16T16:16:45.265Z",
  longitude: -76.0259,
  latitude: -15.0306,
};

const hoursAfter = (hours: number) => new Date(Date.parse(event.occurredAt) + hours * 3_600_000);

describe("isRecent", () => {
  it("holds for six hours after the event started", () => {
    expect(isRecent(event, hoursAfter(0))).toBe(true);
    expect(isRecent(event, hoursAfter(5.9))).toBe(true);
    expect(isRecent(event, hoursAfter(6))).toBe(false);
  });
});

describe("toFeatureCollection", () => {
  it("places each event at its longitude and latitude, in GeoJSON order", () => {
    const collection = toFeatureCollection([event], hoursAfter(1));

    expect(collection).toEqual({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [-76.0259, -15.0306] },
          properties: { id: event.id, kind: "earthquake", severity: "moderate", recent: true },
        },
      ],
    });
  });

  it("marks older events as not recent", () => {
    const [feature] = toFeatureCollection([event], hoursAfter(12)).features;

    expect(feature?.properties.recent).toBe(false);
  });

  it("returns an empty collection when there are no events", () => {
    expect(toFeatureCollection([], hoursAfter(0)).features).toEqual([]);
  });
});
