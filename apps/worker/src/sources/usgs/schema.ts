import { z } from "zod";

/** USGS PAGER alert levels, from the lowest to the highest expected impact. */
export const pagerAlerts = ["green", "yellow", "orange", "red"] as const;
export type PagerAlert = (typeof pagerAlerts)[number];

/**
 * Envelope of a USGS GeoJSON summary feed. Features are validated one by one
 * so that a single malformed entry does not discard the whole feed.
 *
 * @see https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php
 */
export const usgsFeedSchema = z.object({
  type: z.literal("FeatureCollection"),
  features: z.array(z.unknown()),
});

/**
 * A single feed entry. Only the fields HazardWatch relies on are validated
 * and unknown keys are dropped. Fields that do not identify or locate the
 * event are allowed to be missing, so that upstream changes degrade the
 * data instead of halting ingestion.
 */
export const usgsFeatureSchema = z.object({
  id: z.string().min(1),
  properties: z.object({
    mag: z.number().nullish(),
    magType: z.string().nullish(),
    place: z.string().nullish(),
    /** Origin time, in milliseconds since the epoch. */
    time: z.int(),
    /** Last update of the event by USGS, in milliseconds since the epoch. */
    updated: z.int().nullish(),
    url: z.url(),
    title: z.string().min(1),
    /** "earthquake", or another seismic event such as "quarry blast". */
    type: z.string(),
    alert: z.enum(pagerAlerts).nullish(),
    /** "automatic" until a seismologist reviews the event, then "reviewed". */
    status: z.string().nullish(),
    /** 1 when the event is in a region covered by tsunami warning centres. */
    tsunami: z.number().nullish(),
    felt: z.number().nullish(),
    sig: z.number().nullish(),
    net: z.string().nullish(),
  }),
  geometry: z.object({
    type: z.literal("Point"),
    /** Longitude, latitude and depth in kilometres. */
    coordinates: z.tuple([
      z.number().min(-180).max(180),
      z.number().min(-90).max(90),
      z.number().nullable(),
    ]),
  }),
});

export type UsgsFeature = z.infer<typeof usgsFeatureSchema>;
