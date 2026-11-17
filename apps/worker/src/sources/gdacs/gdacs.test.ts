import { pino } from "pino";
import { describe, expect, it, vi } from "vitest";

import { HttpError } from "../../http.js";
import type { FetchContext } from "../types.js";
import { parseGdacsDate, toIngestedEvent } from "./normalize.js";
import type { GdacsFeature } from "./schema.js";
import { createGdacsSource, GDACS_EVENTS_URL, GDACS_PAGE_SIZE } from "./source.js";

interface FeatureOverrides {
  properties?: Partial<GdacsFeature["properties"]>;
  geometry?: GdacsFeature["geometry"];
}

/** Builds a feature modelled on a real entry of the GDACS event list. */
function buildFeature({ properties, geometry }: FeatureOverrides = {}): GdacsFeature {
  return {
    geometry: geometry ?? { type: "Point", coordinates: [87.3, 12.2] },
    properties: {
      eventtype: "TC",
      eventid: 1_001_351,
      episodeid: 4,
      name: "Tropical Cyclone AKVAN-26",
      eventname: "AKVAN-26",
      glide: "",
      alertlevel: "Orange",
      alertscore: 2,
      episodealertlevel: "Orange",
      iscurrent: "true",
      country: "India",
      affectedcountries: [{ iso3: "IND" }],
      fromdate: "2026-11-16T18:00:00",
      todate: "2026-11-17T12:00:00",
      datemodified: "2026-11-17T14:36:32",
      source: "JTWC",
      url: {
        report: "https://www.gdacs.org/report.aspx?eventid=1001351&episodeid=4&eventtype=TC",
      },
      severitydata: {
        severity: 83.3328,
        severitytext: "Tropical Storm (maximum wind speed of 83 km/h)",
        severityunit: "km/h",
      },
      ...properties,
    },
  };
}

/** A full page of distinct events, numbered from `firstId`. */
function fullPage(firstId = 1): GdacsFeature[] {
  return Array.from({ length: GDACS_PAGE_SIZE }, (_, index) =>
    buildFeature({ properties: { eventid: firstId + index } }),
  );
}

/** Serves the given pages in order, then answers 404 as GDACS does past the last one. */
function servePages(...pages: unknown[][]) {
  return vi.fn<typeof globalThis.fetch>((input) => {
    const url = new URL(input instanceof Request ? input.url : input);
    const features = pages[Number(url.searchParams.get("pageNumber")) - 1];
    return Promise.resolve(
      features === undefined
        ? Response.json({ title: "Not Found", status: 404 }, { status: 404 })
        : Response.json({ type: "FeatureCollection", features }),
    );
  });
}

function requestedUrl(fetch: ReturnType<typeof servePages>, call = 0): URL {
  const input = fetch.mock.calls[call]?.[0];
  if (typeof input !== "string") {
    throw new Error(`Expected request ${call} to be made with a URL string`);
  }
  return new URL(input);
}

function createContext() {
  const logger = pino({ level: "silent" });
  const warn = vi.spyOn(logger, "warn");
  const context: FetchContext = { signal: new AbortController().signal, logger };
  return { context, warn };
}

describe("parseGdacsDate", () => {
  it("reads timestamps without a time zone as UTC", () => {
    expect(parseGdacsDate("2026-11-17T14:36:32").toISOString()).toBe("2026-11-17T14:36:32.000Z");
  });

  it("honours an explicit time zone", () => {
    expect(parseGdacsDate("2026-11-17T14:36:32+02:00").toISOString()).toBe(
      "2026-11-17T12:36:32.000Z",
    );
  });
});

describe("toIngestedEvent", () => {
  it("maps a feature to a normalised event spanning its reported period", () => {
    expect(toIngestedEvent(buildFeature())).toEqual({
      source: "gdacs",
      externalId: "TC-1001351",
      kind: "tropical_cyclone",
      severity: "severe",
      title: "Tropical Cyclone AKVAN-26",
      url: "https://www.gdacs.org/report.aspx?eventid=1001351&episodeid=4&eventtype=TC",
      location: { x: 87.3, y: 12.2 },
      properties: {
        name: "AKVAN-26",
        alertLevel: "orange",
        alertScore: 2,
        episodeId: 4,
        episodeAlertLevel: "orange",
        ongoing: true,
        country: "India",
        countryCodes: ["IND"],
        measure: { value: 83.3328, unit: "km/h" },
        severityDescription: "Tropical Storm (maximum wind speed of 83 km/h)",
        provider: "JTWC",
        glide: null,
      },
      occurredAt: new Date("2026-11-16T18:00:00Z"),
      activeUntil: new Date("2026-11-17T12:00:00Z"),
      sourceUpdatedAt: new Date("2026-11-17T14:36:32Z"),
    });
  });

  it.each([
    { eventtype: "TC", kind: "tropical_cyclone" },
    { eventtype: "FL", kind: "flood" },
    { eventtype: "VO", kind: "volcano" },
    { eventtype: "DR", kind: "drought" },
    { eventtype: "WF", kind: "wildfire" },
  ] as const)("maps $eventtype events to the $kind kind", ({ eventtype, kind }) => {
    expect(toIngestedEvent(buildFeature({ properties: { eventtype } })).kind).toBe(kind);
  });

  it.each([
    { alertlevel: "Green", severity: "minor" },
    { alertlevel: "Orange", severity: "severe" },
    { alertlevel: "Red", severity: "extreme" },
  ] as const)("rates $alertlevel alerts as $severity", ({ alertlevel, severity }) => {
    expect(toIngestedEvent(buildFeature({ properties: { alertlevel } })).severity).toBe(severity);
  });

  it("treats an event without a reported end as instantaneous", () => {
    const event = toIngestedEvent(buildFeature({ properties: { todate: null } }));

    expect(event.activeUntil).toEqual(event.occurredAt);
  });

  it("never ends an event before it starts", () => {
    const event = toIngestedEvent(
      buildFeature({
        properties: { fromdate: "2026-11-16T18:00:00", todate: "2026-11-16T06:00:00" },
      }),
    );

    expect(event.activeUntil).toEqual(event.occurredAt);
  });

  it("drops the placeholders GDACS sends instead of missing values", () => {
    const event = toIngestedEvent(
      buildFeature({
        properties: {
          eventtype: "VO",
          name: "Eruption  Mayon",
          eventname: "",
          country: " ",
          source: "",
          iscurrent: undefined,
          affectedcountries: [],
          severitydata: { severity: 0, severitytext: "Magnitude 0 ", severityunit: "" },
        },
      }),
    );

    expect(event.title).toBe("Eruption Mayon");
    expect(event.properties).toMatchObject({
      name: null,
      country: null,
      provider: null,
      ongoing: null,
      countryCodes: [],
      measure: null,
      severityDescription: null,
    });
  });
});

describe("createGdacsSource", () => {
  const now = () => new Date("2026-11-17T16:00:00Z");

  it("requests the events modified during the lookback period", async () => {
    const fetch = servePages([buildFeature()]);
    const { context } = createContext();

    const events = await createGdacsSource({ fetch, now }).fetchEvents(context);

    expect(events).toEqual([toIngestedEvent(buildFeature())]);
    const url = requestedUrl(fetch);
    expect(`${url.origin}${url.pathname}`).toBe(GDACS_EVENTS_URL);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      eventlist: "TC;FL;VO;DR;WF",
      alertlevel: "Green;Orange;Red",
      datemodified: "2026-11-15T16:00:00",
      pageSize: "100",
      pageNumber: "1",
    });
  });

  it("pages through the list until a page comes back short", async () => {
    const fetch = servePages(fullPage(), [buildFeature({ properties: { eventid: 999 } })]);
    const { context } = createContext();

    const events = await createGdacsSource({ fetch, now }).fetchEvents(context);

    expect(events).toHaveLength(GDACS_PAGE_SIZE + 1);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(requestedUrl(fetch, 1).searchParams.get("pageNumber")).toBe("2");
  });

  it("stops at the 404 GDACS returns past the last page", async () => {
    const fetch = servePages(fullPage());
    const { context } = createContext();

    const events = await createGdacsSource({ fetch, now }).fetchEvents(context);

    expect(events).toHaveLength(GDACS_PAGE_SIZE);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("returns nothing when no event was modified recently", async () => {
    const fetch = servePages();
    const { context } = createContext();

    await expect(createGdacsSource({ fetch, now }).fetchEvents(context)).resolves.toEqual([]);
  });

  it("keeps the most recent revision of an event listed on two pages", async () => {
    const fetch = servePages(fullPage(), [
      buildFeature({
        properties: { eventid: 1, alertlevel: "Red", datemodified: "2026-11-17T09:00:00" },
      }),
      buildFeature({
        properties: { eventid: 2, alertlevel: "Red", datemodified: "2026-11-17T15:00:00" },
      }),
    ]);
    const { context } = createContext();

    const events = await createGdacsSource({ fetch, now }).fetchEvents(context);
    const severityOf = (externalId: string) =>
      events.find((event) => event.externalId === externalId)?.severity;

    expect(events).toHaveLength(GDACS_PAGE_SIZE);
    expect(severityOf("TC-1")).toBe("severe");
    expect(severityOf("TC-2")).toBe("extreme");
  });

  it("skips malformed events, reports them and keeps the rest", async () => {
    const valid = buildFeature();
    const fetch = servePages([
      valid,
      { properties: { eventtype: "FL", eventid: 5 }, geometry: null },
      { ...valid, properties: { ...valid.properties, eventtype: "EQ", eventid: 6 } },
    ]);
    const { context, warn } = createContext();

    const events = await createGdacsSource({ fetch, now }).fetchEvents(context);

    expect(events.map((event) => event.externalId)).toEqual(["TC-1001351"]);
    expect(warn.mock.calls.map(([details]) => details)).toMatchObject([
      { eventKey: "FL-5" },
      { eventKey: "EQ-6" },
    ]);
  });

  it("stops after the maximum number of pages and reports it", async () => {
    const fetch = servePages(fullPage(1), fullPage(101), fullPage(201));
    const { context, warn } = createContext();

    const events = await createGdacsSource({ fetch, now, maxPages: 2 }).fetchEvents(context);

    expect(events).toHaveLength(2 * GDACS_PAGE_SIZE);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenCalledWith(
      { maxPages: 2 },
      "stopped paging through GDACS events, some may be missing",
    );
  });

  it("fails the run when the payload is not a feature collection", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(() =>
      Promise.resolve(Response.json({ error: "service under maintenance" })),
    );
    const { context } = createContext();

    await expect(createGdacsSource({ fetch, now }).fetchEvents(context)).rejects.toThrow(
      "Unexpected GDACS event list format",
    );
  });

  it("fails the run when GDACS answers with a server error", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(() =>
      Promise.resolve(new Response(null, { status: 503 })),
    );
    const { context } = createContext();

    await expect(createGdacsSource({ fetch, now }).fetchEvents(context)).rejects.toThrow(HttpError);
  });
});
