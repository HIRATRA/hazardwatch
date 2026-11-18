import { pino } from "pino";
import { describe, expect, it, vi } from "vitest";

import { severityForPower, toFireEvents } from "./aggregate.js";
import { parseDetections, type Detection } from "./parse.js";
import { createFirmsSource } from "./source.js";

const logger = pino({ level: "silent" });
const signal = new AbortController().signal;

const HEADER =
  "latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,confidence,version,bright_ti5,frp,daynight";

/** A CSV line in the layout of the FIRMS VIIRS files. */
function line(
  latitude: number,
  longitude: number,
  { time = "0034", satellite = "N20", confidence = "nominal", frp = 100 } = {},
) {
  return `${latitude},${longitude},333.2,0.34,0.56,2026-11-17,${time},${satellite},${confidence},2.0NRT,298.75,${frp},D`;
}

function detection(overrides: Partial<Detection> = {}): Detection {
  return {
    latitude: -22.55,
    longitude: 125.6,
    detectedAt: new Date("2026-11-17T05:10:00Z"),
    satellite: "N20",
    confidence: "nominal",
    frp: 100,
    ...overrides,
  };
}

describe("parseDetections", () => {
  it("reads detections from a FIRMS file", () => {
    const { detections, skipped } = parseDetections(
      [HEADER, line(-13.84192, -171.84068, { frp: 2.32 }), ""].join("\n"),
    );

    expect(skipped).toBe(0);
    expect(detections).toEqual([
      {
        latitude: -13.84192,
        longitude: -171.84068,
        detectedAt: new Date("2026-11-17T00:34:00Z"),
        satellite: "N20",
        confidence: "nominal",
        frp: 2.32,
      },
    ]);
  });

  it("reads the time of the pass as hours and minutes in UTC", () => {
    const { detections } = parseDetections([HEADER, line(0, 0, { time: "1742" })].join("\n"));

    expect(detections[0]?.detectedAt).toEqual(new Date("2026-11-17T17:42:00Z"));
  });

  it("skips and counts rows it cannot read", () => {
    const { detections, skipped } = parseDetections(
      [HEADER, line(0, 0), line(95, 0), line(0, 0, { confidence: "maybe" }), "garbage"].join("\n"),
    );

    expect(detections).toHaveLength(1);
    expect(skipped).toBe(3);
  });

  it("refuses a file whose columns changed", () => {
    expect(() => parseDetections("lat,lon\n1,2")).toThrow(/Unexpected FIRMS file format/);
  });

  it("reads an empty file, as a satellite out of service publishes", () => {
    expect(parseDetections(`${HEADER}\n`)).toEqual({ detections: [], skipped: 0 });
  });
});

describe("severityForPower", () => {
  it.each([
    [249, null],
    [250, "minor"],
    [499, "minor"],
    [500, "moderate"],
    [1000, "severe"],
    [2500, "extreme"],
    [12_000, "extreme"],
  ])("rates %d MW as %s", (frpMw, severity) => {
    expect(severityForPower(frpMw)).toBe(severity);
  });
});

describe("toFireEvents", () => {
  it("groups the detections of a cell into one fire", () => {
    const events = toFireEvents([
      detection({
        latitude: -22.55,
        longitude: 125.6,
        detectedAt: new Date("2026-11-17T05:10:00Z"),
      }),
      detection({
        latitude: -22.6,
        longitude: 125.7,
        detectedAt: new Date("2026-11-17T17:20:00Z"),
      }),
      detection({ latitude: -22.65, longitude: 125.65, frp: 120, confidence: "high" }),
    ]);

    expect(events).toEqual([
      {
        source: "nasa_firms",
        externalId: "0.25/-91/502",
        kind: "wildfire",
        severity: "minor",
        title: "3 fire hotspots seen by satellite",
        url: "https://firms.modaps.eosdis.nasa.gov/map/#d:24hrs;@125.65,-22.60,9.0z",
        location: { x: expect.closeTo(125.65, 6) as number, y: expect.closeTo(-22.6, 6) as number },
        properties: {
          hotspots: 3,
          highConfidenceHotspots: 1,
          frpMw: 320,
          peakFrpMw: 120,
          satellites: ["N20"],
          cellSizeDegrees: 0.25,
        },
        occurredAt: new Date("2026-11-17T05:10:00Z"),
        activeUntil: new Date("2026-11-17T17:20:00Z"),
        sourceUpdatedAt: null,
      },
    ]);
  });

  it("counts a fire seen by two satellites once", () => {
    const [fire] = toFireEvents([
      detection({ satellite: "N20", frp: 300 }),
      detection({ satellite: "N21", frp: 200 }),
    ]);

    expect(fire?.properties).toMatchObject({ frpMw: 300, satellites: ["N20", "N21"] });
  });

  it("leaves out small fires", () => {
    expect(toFireEvents([detection({ frp: 249 })])).toEqual([]);
  });

  it("ignores low-confidence detections", () => {
    expect(toFireEvents([detection({ frp: 600, confidence: "low" })])).toEqual([]);
  });

  it("keeps fires in different cells apart", () => {
    const events = toFireEvents([
      detection({ latitude: -22.55, frp: 300 }),
      detection({ latitude: -22.95, frp: 300 }),
    ]);

    expect(events.map((event) => event.externalId).sort()).toEqual([
      "0.25/-91/502",
      "0.25/-92/502",
    ]);
  });
});

describe("createFirmsSource", () => {
  const files = ["https://firms.example.test/n20.csv", "https://firms.example.test/n21.csv"];

  /** Each file holds the detections of one satellite, both seeing the same fire. */
  const csvOf = (url: string) =>
    [
      HEADER,
      line(-22.55, 125.6, { frp: 300, satellite: url.endsWith("n20.csv") ? "N20" : "N21" }),
    ].join("\n");

  /** Serves the files, with a Last-Modified that tests can change. */
  function serveFiles(lastModified: { value: string }) {
    return vi.fn<typeof globalThis.fetch>((input, init) =>
      Promise.resolve(
        init?.method === "HEAD"
          ? new Response(null, { headers: { "last-modified": lastModified.value } })
          : new Response(csvOf(input instanceof Request ? input.url : input.toString())),
      ),
    );
  }

  const downloads = (fetch: ReturnType<typeof serveFiles>) =>
    fetch.mock.calls.filter(([, init]) => init?.method === "GET").length;

  it("turns the files into fires", async () => {
    const fetch = serveFiles({ value: "Wed, 18 Nov 2026 11:40:18 GMT" });
    const source = createFirmsSource({ files, fetch });

    const events = await source.fetchEvents({ signal, logger });

    expect(source).toMatchObject({ id: "nasa_firms", windowed: true });
    expect(events).toHaveLength(1);
    expect(events[0]?.properties).toMatchObject({ frpMw: 300 });
    expect(downloads(fetch)).toBe(2);
  });

  it("skips the download when the files did not change", async () => {
    const fetch = serveFiles({ value: "Wed, 18 Nov 2026 11:40:18 GMT" });
    const source = createFirmsSource({ files, fetch });
    await source.fetchEvents({ signal, logger });

    const events = await source.fetchEvents({ signal, logger });

    expect(events).toEqual([]);
    expect(downloads(fetch)).toBe(2);
  });

  it("downloads the files again once one of them changed", async () => {
    const lastModified = { value: "Wed, 18 Nov 2026 11:40:18 GMT" };
    const fetch = serveFiles(lastModified);
    const source = createFirmsSource({ files, fetch });
    await source.fetchEvents({ signal, logger });

    lastModified.value = "Wed, 18 Nov 2026 12:40:18 GMT";
    const events = await source.fetchEvents({ signal, logger });

    expect(events).toHaveLength(1);
    expect(downloads(fetch)).toBe(4);
  });

  it("fails the run when a file cannot be downloaded", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>((_input, init) =>
      Promise.resolve(
        init?.method === "HEAD" ? new Response(null) : new Response("busy", { status: 503 }),
      ),
    );
    const source = createFirmsSource({ files, fetch });

    await expect(source.fetchEvents({ signal, logger })).rejects.toMatchObject({ status: 503 });
  });
});
