import type { HazardKind, HazardSeverity } from "@hazardwatch/db";

import type { IngestedEvent } from "../types.js";
import type { GdacsAlertLevel, GdacsEventType, GdacsFeature } from "./schema.js";

const kindByEventType: Record<GdacsEventType, HazardKind> = {
  TC: "tropical_cyclone",
  FL: "flood",
  VO: "volcano",
  DR: "drought",
  WF: "wildfire",
};

/**
 * GDACS alerts estimate whether international assistance will be needed:
 * unlikely (green), possibly (orange) or likely (red). The colours follow the
 * same scale as the USGS PAGER alerts used for earthquakes.
 */
const severityByAlertLevel: Record<GdacsAlertLevel, HazardSeverity> = {
  Green: "minor",
  Orange: "severe",
  Red: "extreme",
};

const timeZoneDesignator = /(?:Z|[+-]\d{2}:?\d{2})$/i;

/** Parses a GDACS timestamp, which is in UTC even when it does not say so. */
export function parseGdacsDate(value: string): Date {
  return new Date(timeZoneDesignator.test(value) ? value : `${value}Z`);
}

/** Formats a date the way the GDACS API expects it: UTC, without a zone. */
export function formatGdacsDate(date: Date): string {
  return date.toISOString().slice(0, 19);
}

/** Identifies an event across episodes. Event ids are only unique within a type. */
export function gdacsExternalId(eventType: string, eventId: number): string {
  return `${eventType}-${eventId}`;
}

/** Maps a validated GDACS feature to the normalised event shape. */
export function toIngestedEvent({ properties, geometry }: GdacsFeature): IngestedEvent {
  const [longitude, latitude] = geometry.coordinates;
  const occurredAt = parseGdacsDate(properties.fromdate);
  const reportedEnd = properties.todate == null ? occurredAt : parseGdacsDate(properties.todate);
  // GDACS reports "Magnitude 0" without a unit when it has no measure.
  const measured = properties.severitydata?.severityunit.trim() ? properties.severitydata : null;

  return {
    source: "gdacs",
    externalId: gdacsExternalId(properties.eventtype, properties.eventid),
    kind: kindByEventType[properties.eventtype],
    severity: severityByAlertLevel[properties.alertlevel],
    title: properties.name.replace(/\s+/g, " "),
    url: properties.url?.report ?? null,
    location: { x: longitude, y: latitude },
    properties: {
      name: blankToNull(properties.eventname),
      alertLevel: properties.alertlevel.toLowerCase(),
      alertScore: properties.alertscore ?? null,
      episodeId: properties.episodeid ?? null,
      episodeAlertLevel: properties.episodealertlevel?.toLowerCase() ?? null,
      ongoing: properties.iscurrent == null ? null : properties.iscurrent === "true",
      country: blankToNull(properties.country),
      countryCodes: [...new Set(properties.affectedcountries?.map(({ iso3 }) => iso3))],
      // Wind speed for cyclones, burnt area for wildfires, affected area for droughts.
      measure: measured ? { value: measured.severity, unit: measured.severityunit.trim() } : null,
      severityDescription: blankToNull(measured?.severitytext),
      provider: blankToNull(properties.source),
      glide: blankToNull(properties.glide),
    },
    occurredAt,
    // Never let an inconsistent report end the event before it starts.
    activeUntil: reportedEnd < occurredAt ? occurredAt : reportedEnd,
    sourceUpdatedAt:
      properties.datemodified == null ? null : parseGdacsDate(properties.datemodified),
  };
}

function blankToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
