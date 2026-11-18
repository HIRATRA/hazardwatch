import { describe, expect, it } from "vitest";

import {
  latestPicturedDay,
  shiftDay,
  snapshotDays,
  snapshotFrame,
  snapshotUrl,
  SNAPSHOT_HEIGHT,
  SNAPSHOT_WIDTH,
} from "./snapshot";

describe("snapshotFrame", () => {
  it("centres the event, wider than high at the equator to fit the picture", () => {
    const { bounds, marker } = snapshotFrame({ kind: "wildfire", latitude: 0, longitude: 20 });
    const [south, west, north, east] = bounds;

    expect(north - south).toBeCloseTo(2.4);
    expect(east - west).toBeCloseTo((2.4 * SNAPSHOT_WIDTH) / SNAPSHOT_HEIGHT);
    expect(marker).toEqual({ x: 0.5, y: 0.5 });
  });

  it("takes in more longitude away from the equator, where degrees shrink", () => {
    const equator = snapshotFrame({ kind: "earthquake", latitude: 0, longitude: 0 }).bounds;
    const north = snapshotFrame({ kind: "earthquake", latitude: 60, longitude: 0 }).bounds;

    expect(north[3] - north[1]).toBeCloseTo((equator[3] - equator[1]) * 2, 1);
  });

  it("frames a cyclone wider than a fire", () => {
    const fire = snapshotFrame({ kind: "wildfire", latitude: 10, longitude: 0 }).bounds;
    const cyclone = snapshotFrame({ kind: "tropical_cyclone", latitude: 10, longitude: 0 }).bounds;

    expect(cyclone[2] - cyclone[0]).toBeGreaterThan(fire[2] - fire[0]);
  });

  it("stays within the date line, moving the event off centre", () => {
    const { bounds, marker } = snapshotFrame({
      kind: "earthquake",
      latitude: -17,
      longitude: 179,
    });

    expect(bounds[3]).toBe(180);
    expect(marker.x).toBeGreaterThan(0.5);
  });

  it("stays within the poles", () => {
    const { bounds, marker } = snapshotFrame({ kind: "drought", latitude: 88, longitude: 0 });

    expect(bounds[2]).toBe(90);
    expect(bounds[2] - bounds[0]).toBeCloseTo(8);
    expect(marker.y).toBeLessThan(0.5);
  });
});

describe("snapshotUrl", () => {
  it("asks for true colour, fires and coastlines on the day", () => {
    const url = new URL(
      snapshotUrl(snapshotFrame({ kind: "wildfire", latitude: 7, longitude: 21 }), "2026-11-18"),
    );

    expect(url.searchParams.get("TIME")).toBe("2026-11-18");
    expect(url.searchParams.get("LAYERS")?.split(",")).toHaveLength(3);
    expect(url.searchParams.get("WIDTH")).toBe(String(SNAPSHOT_WIDTH));
  });
});

describe("shiftDay", () => {
  it("moves across months and years", () => {
    expect(shiftDay("2026-11-30", 1)).toBe("2026-12-01");
    expect(shiftDay("2026-01-01", -1)).toBe("2025-12-31");
  });
});

describe("latestPicturedDay", () => {
  it("is today in the east once the afternoon pass is published", () => {
    expect(latestPicturedDay(120, new Date("2026-11-18T09:00:00Z"))).toBe("2026-11-18");
    expect(latestPicturedDay(120, new Date("2026-11-18T08:00:00Z"))).toBe("2026-11-17");
  });

  it("is yesterday in the west, pictured late in the UTC day", () => {
    expect(latestPicturedDay(-120, new Date("2026-11-18T23:00:00Z"))).toBe("2026-11-17");
  });
});

describe("snapshotDays", () => {
  const now = new Date("2026-11-18T21:00:00Z");

  it("starts on the last day of activity when it is pictured", () => {
    expect(
      snapshotDays(
        {
          longitude: 21,
          occurredAt: "2026-11-15T10:00:00Z",
          activeUntil: "2026-11-16T10:00:00Z",
        },
        now,
      ),
    ).toEqual({ first: "2026-11-08", last: "2026-11-18", initial: "2026-11-16" });
  });

  it("starts on the latest pictured day for an event still going on", () => {
    expect(
      snapshotDays(
        {
          longitude: -120,
          occurredAt: "2026-11-18T19:00:00Z",
          activeUntil: "2026-11-18T19:00:00Z",
        },
        now,
      ),
    ).toEqual({ first: "2026-11-11", last: "2026-11-17", initial: "2026-11-17" });
  });
});
