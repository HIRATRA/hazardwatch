import { pino } from "pino";
import { describe, expect, it, vi } from "vitest";

import type { FetchContext } from "../types.js";
import { earthquakeSeverity, toIngestedEvent } from "./normalize.js";
import type { UsgsFeature } from "./schema.js";
import { createUsgsSource, USGS_FEED_URL } from "./source.js";

interface FeatureOverrides {
  id?: string;
  properties?: Partial<UsgsFeature["properties"]>;
  geometry?: UsgsFeature["geometry"];
}

/** Builds a feature modelled on a real entry of the USGS feed. */
function buildFeature({ properties, ...overrides }: FeatureOverrides = {}): UsgsFeature {
  return {
    id: "us7000tykh",
    geometry: { type: "Point", coordinates: [-76.0259, -15.0306, 10] },
    ...overrides,
    properties: {
      mag: 5.4,
      magType: "mww",
      place: "95 km WSW of Changuillo, Peru",
      time: 1_794_845_805_265,
      updated: 1_794_847_249_824,
      url: "https://earthquake.usgs.gov/earthquakes/eventpage/us7000tykh",
      title: "M 5.4 - 95 km WSW of Changuillo, Peru",
      type: "earthquake",
      alert: "green",
      status: "reviewed",
      tsunami: 0,
      felt: null,
      sig: 449,
      net: "us",
      ...properties,
    },
  };
}

function serveFeed(body: unknown) {
  return vi.fn<typeof globalThis.fetch>(() => Promise.resolve(Response.json(body)));
}

function createContext() {
  const logger = pino({ level: "silent" });
  const warn = vi.spyOn(logger, "warn");
  const context: FetchContext = { signal: new AbortController().signal, logger };
  return { context, warn };
}

describe("earthquakeSeverity", () => {
  it.each([
    { magnitude: 3.1, alert: null, expected: "minor" },
    { magnitude: null, alert: null, expected: "minor" },
    { magnitude: 5.4, alert: null, expected: "moderate" },
    { magnitude: 6.2, alert: null, expected: "severe" },
    { magnitude: 7.8, alert: null, expected: "extreme" },
    { magnitude: 4.6, alert: "orange", expected: "severe" },
    { magnitude: 5.0, alert: "red", expected: "extreme" },
    { magnitude: 7.1, alert: "green", expected: "extreme" },
  ] as const)("rates M$magnitude with a $alert alert as $expected", (testCase) => {
    expect(earthquakeSeverity(testCase.magnitude, testCase.alert)).toBe(testCase.expected);
  });
});

describe("toIngestedEvent", () => {
  it("maps a feature to a normalised earthquake event", () => {
    expect(toIngestedEvent(buildFeature())).toEqual({
      source: "usgs",
      externalId: "us7000tykh",
      kind: "earthquake",
      severity: "moderate",
      title: "M 5.4 - 95 km WSW of Changuillo, Peru",
      url: "https://earthquake.usgs.gov/earthquakes/eventpage/us7000tykh",
      location: { x: -76.0259, y: -15.0306 },
      properties: {
        magnitude: 5.4,
        magnitudeType: "mww",
        depthKm: 10,
        place: "95 km WSW of Changuillo, Peru",
        pagerAlert: "green",
        tsunamiFlag: false,
        feltReports: null,
        significance: 449,
        reviewStatus: "reviewed",
        network: "us",
      },
      occurredAt: new Date(1_794_845_805_265),
      sourceUpdatedAt: new Date(1_794_847_249_824),
    });
  });

  it("leaves the update time empty when USGS does not provide one", () => {
    const event = toIngestedEvent(buildFeature({ properties: { updated: undefined } }));

    expect(event.sourceUpdatedAt).toBeNull();
  });
});

describe("createUsgsSource", () => {
  it("fetches the daily M2.5+ feed and returns its earthquakes", async () => {
    const fetch = serveFeed({ type: "FeatureCollection", features: [buildFeature()] });
    const { context } = createContext();

    const events = await createUsgsSource({ fetch }).fetchEvents(context);

    expect(events).toEqual([toIngestedEvent(buildFeature())]);
    expect(fetch.mock.calls[0]?.[0]).toBe(USGS_FEED_URL);
  });

  it("ignores seismic events that are not earthquakes", async () => {
    const fetch = serveFeed({
      type: "FeatureCollection",
      features: [
        buildFeature({ id: "quake" }),
        buildFeature({ id: "blast", properties: { type: "quarry blast" } }),
      ],
    });
    const { context } = createContext();

    const events = await createUsgsSource({ fetch }).fetchEvents(context);

    expect(events.map((event) => event.externalId)).toEqual(["quake"]);
  });

  it("skips malformed features, reports them and keeps the rest", async () => {
    const fetch = serveFeed({
      type: "FeatureCollection",
      features: [
        buildFeature({ id: "valid" }),
        { id: "no-geometry", properties: {}, geometry: null },
        buildFeature({
          id: "off-the-map",
          geometry: { type: "Point", coordinates: [200, 95, 10] },
        }),
      ],
    });
    const { context, warn } = createContext();

    const events = await createUsgsSource({ fetch }).fetchEvents(context);

    expect(events.map((event) => event.externalId)).toEqual(["valid"]);
    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn.mock.calls.map(([details]) => details)).toMatchObject([
      { featureId: "no-geometry" },
      { featureId: "off-the-map" },
    ]);
  });

  it("fails the run when the payload is not a feature collection", async () => {
    const fetch = serveFeed({ error: "service under maintenance" });
    const { context } = createContext();

    await expect(createUsgsSource({ fetch }).fetchEvents(context)).rejects.toThrow(
      "Unexpected USGS feed format",
    );
  });
});
