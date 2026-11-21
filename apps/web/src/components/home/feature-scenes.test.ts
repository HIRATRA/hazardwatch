import { describe, expect, it } from "vitest";

import type { MapEvent } from "@/lib/events/types";
import type { Bounds } from "@/lib/imagery";

import { pickAlerts, placeEvents, zoneEllipse } from "./feature-scenes";

const now = new Date("2026-11-21T12:00:00Z");

function event(overrides: Partial<MapEvent>): MapEvent {
  return {
    id: "id",
    source: "usgs",
    kind: "earthquake",
    severity: "minor",
    title: "Event",
    url: null,
    occurredAt: "2026-11-21T00:00:00Z",
    activeUntil: "2026-11-21T00:00:00Z",
    longitude: 0,
    latitude: 0,
    ...overrides,
  };
}

const bounds: Bounds = [0, 0, 10, 20];

describe("placeEvents", () => {
  it("places events in percent of the picture from the top left", () => {
    const [point] = placeEvents([event({ longitude: 5, latitude: 7.5 })], bounds, {
      now,
      limit: 10,
    });
    expect(point).toMatchObject({ x: 25, y: 25 });
  });

  it("leaves out events outside the area", () => {
    const points = placeEvents([event({ longitude: 25, latitude: 5 })], bounds, { now, limit: 10 });
    expect(points).toEqual([]);
  });

  it("keeps the most severe events and draws them last", () => {
    const points = placeEvents(
      [
        event({ severity: "minor" }),
        event({ severity: "extreme" }),
        event({ severity: "moderate" }),
      ],
      bounds,
      { now, limit: 2 },
    );
    expect(points.map((point) => point.severity)).toEqual(["moderate", "extreme"]);
  });

  it("marks recent events and those within the zone", () => {
    const zone = { name: "Zone", latitude: 5, longitude: 5, radiusKm: 100 };
    const points = placeEvents(
      [
        event({ latitude: 5.5, longitude: 5, occurredAt: "2026-11-21T11:00:00Z" }),
        event({ latitude: 8, longitude: 5 }),
      ],
      bounds,
      { now, limit: 10, zone },
    );
    expect(points).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ y: 45, inZone: true, recent: true }),
        expect.objectContaining({ y: 20, inZone: false, recent: false }),
      ]),
    );
  });
});

describe("zoneEllipse", () => {
  it("is wider than tall away from the equator", () => {
    const ellipse = zoneEllipse(
      { name: "Paris", latitude: 60, longitude: 10, radiusKm: 111 },
      [50, 0, 70, 20],
    );
    expect(ellipse.cx).toBe(50);
    expect(ellipse.cy).toBe(50);
    expect(ellipse.ry).toBeCloseTo(5, 0);
    expect(ellipse.rx).toBeCloseTo(10, 0);
  });
});

describe("pickAlerts", () => {
  it("lists the most severe events, the latest first", () => {
    const alerts = pickAlerts(
      [
        event({ id: "a", severity: "severe", occurredAt: "2026-11-21T01:00:00Z" }),
        event({ id: "b", severity: "minor" }),
        event({ id: "c", severity: "severe", occurredAt: "2026-11-21T02:00:00Z" }),
      ],
      2,
    );
    expect(alerts.map((alert) => alert.id)).toEqual(["c", "a"]);
  });

  it("brings the most severe event of each kind first", () => {
    const alerts = pickAlerts(
      [
        event({ id: "fire-1", kind: "wildfire", severity: "extreme" }),
        event({ id: "fire-2", kind: "wildfire", severity: "extreme" }),
        event({ id: "quake", kind: "earthquake", severity: "moderate" }),
      ],
      2,
    );
    expect(alerts.map((alert) => alert.id)).toEqual(["fire-1", "quake"]);
  });
});
