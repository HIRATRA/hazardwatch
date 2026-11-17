import { z } from "zod";

/**
 * GDACS hazard codes HazardWatch ingests: tropical cyclones, floods,
 * volcanoes, droughts and wildfires. GDACS also reports earthquakes, but
 * those come from the USGS feed it relies on, so they are left out.
 */
export const gdacsEventTypes = ["TC", "FL", "VO", "DR", "WF"] as const;
export type GdacsEventType = (typeof gdacsEventTypes)[number];

/** GDACS alert levels, from the lowest to the highest expected humanitarian impact. */
export const gdacsAlertLevels = ["Green", "Orange", "Red"] as const;
export type GdacsAlertLevel = (typeof gdacsAlertLevels)[number];

/** GDACS timestamps are in UTC but usually omit the zone, as in "2026-11-17T14:20:36". */
const gdacsDateTime = z.iso.datetime({ local: true });

/**
 * Envelope of a page of the GDACS event list. Features are validated one by
 * one so that a single malformed entry does not discard the whole page.
 *
 * @see https://www.gdacs.org/gdacsapi/swagger/index.html
 */
export const gdacsPageSchema = z.object({
  type: z.literal("FeatureCollection"),
  features: z.array(z.unknown()),
});

/**
 * A single event, as of its latest episode. Only the fields HazardWatch
 * relies on are validated and unknown keys are dropped. Fields that do not
 * identify, date or locate the event are allowed to be missing.
 */
export const gdacsFeatureSchema = z.object({
  properties: z.object({
    eventtype: z.enum(gdacsEventTypes),
    /** Unique within an event type only. */
    eventid: z.int().positive(),
    /** An event is reassessed in episodes, for example at each cyclone advisory. */
    episodeid: z.int().nullish(),
    name: z.string().trim().min(1),
    /** Short name such as a cyclone or volcano name, often empty. */
    eventname: z.string().nullish(),
    /** GLobal IDEntifier shared with other disaster databases, often empty. */
    glide: z.string().nullish(),
    /** Highest alert level reached by the event so far. */
    alertlevel: z.enum(gdacsAlertLevels),
    alertscore: z.number().nullish(),
    episodealertlevel: z.enum(gdacsAlertLevels).nullish(),
    iscurrent: z.enum(["true", "false"]).nullish(),
    country: z.string().nullish(),
    affectedcountries: z.array(z.object({ iso3: z.string() })).nullish(),
    fromdate: gdacsDateTime,
    todate: gdacsDateTime.nullish(),
    datemodified: gdacsDateTime.nullish(),
    /** Upstream provider, for example JTWC for cyclones or GLOFAS for floods. */
    source: z.string().nullish(),
    url: z.object({ report: z.url() }).nullish(),
    severitydata: z
      .object({
        severity: z.number(),
        severitytext: z.string(),
        severityunit: z.string(),
      })
      .nullish(),
  }),
  /** The centroid of the affected area. */
  geometry: z.object({
    type: z.literal("Point"),
    coordinates: z
      .tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)])
      .rest(z.number()),
  }),
});

export type GdacsFeature = z.infer<typeof gdacsFeatureSchema>;
