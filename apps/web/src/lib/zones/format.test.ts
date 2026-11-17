import { describe, expect, it } from "vitest";

import {
  describeAlertThreshold,
  describeRecentEvents,
  describeZoneArea,
  formatRadius,
} from "./format";

describe("describeAlertThreshold", () => {
  it("names the lowest severity that raises an alert", () => {
    expect(describeAlertThreshold("minor")).toBe("Alerts for every event");
    expect(describeAlertThreshold("severe")).toBe("Alerts for severe events and above");
    expect(describeAlertThreshold("extreme")).toBe("Alerts for extreme events only");
  });

  it("says when alerts are off", () => {
    expect(describeAlertThreshold(null)).toBe("Alerts off");
  });
});

describe("formatRadius", () => {
  it("groups thousands", () => {
    expect(formatRadius(25)).toBe("25 km");
    expect(formatRadius(1000)).toBe("1,000 km");
  });
});

describe("describeZoneArea", () => {
  it("gives the radius and the centre", () => {
    expect(describeZoneArea({ longitude: -9.1393, latitude: 38.7223, radiusKm: 100 })).toBe(
      "Within 100 km of 38.72° N, 9.14° W",
    );
  });
});

describe("describeRecentEvents", () => {
  it("says when the zone is quiet", () => {
    expect(describeRecentEvents({ recentEvents: 0, highestSeverity: null }, "7d")).toBe(
      "No events in the past 7 days",
    );
  });

  it("gives the severity of a single event", () => {
    expect(describeRecentEvents({ recentEvents: 1, highestSeverity: "severe" }, "24h")).toBe(
      "1 severe event in the past 24 hours",
    );
  });

  it("gives the highest severity of several events", () => {
    expect(describeRecentEvents({ recentEvents: 1204, highestSeverity: "extreme" }, "30d")).toBe(
      "1,204 events in the past 30 days, up to extreme",
    );
  });
});
