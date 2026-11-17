import { hazardSeverities, maxZoneRadiusKm, minZoneRadiusKm } from "@hazardwatch/db/constants";
import { z } from "zod";

import { getText } from "@/lib/form";

/** Radii offered when creating a zone, in kilometres. */
export const zoneRadiusOptionsKm = [10, 25, 50, 100, 250, 500, 1000] as const;

export const DEFAULT_ZONE_RADIUS_KM = 100;
export const MAX_ZONE_NAME_LENGTH = 60;

/** Zones a single account may watch, which keeps matching events against them cheap. */
export const MAX_ZONES_PER_USER = 20;

/** Value of the alert threshold field when the user wants no alerts for a zone. */
export const ALERTS_OFF = "off";

/** Values of the alert threshold field: a minimum severity, or no alerts. */
export const alertThresholdChoices = [...hazardSeverities, ALERTS_OFF] as const;

const centerError = "Pick the centre of the zone on the map.";
const radiusError = `Choose a radius between ${minZoneRadiusKm} and ${maxZoneRadiusKm} km.`;
const alertError = "Choose which events to be alerted about.";

const zoneInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Give the zone a name.")
    .max(MAX_ZONE_NAME_LENGTH, `Keep the name to ${MAX_ZONE_NAME_LENGTH} characters or fewer.`),
  longitude: z.number({ error: centerError }).min(-180, centerError).max(180, centerError),
  latitude: z.number({ error: centerError }).min(-90, centerError).max(90, centerError),
  radiusKm: z
    .number({ error: radiusError })
    .int(radiusError)
    .min(minZoneRadiusKm, radiusError)
    .max(maxZoneRadiusKm, radiusError),
  alertMinSeverity: z
    .enum(alertThresholdChoices, { error: alertError })
    .transform((value) => (value === ALERTS_OFF ? null : value)),
});

export type ZoneInput = z.infer<typeof zoneInputSchema>;

/** Validation messages, keyed by the part of the form they relate to. */
export interface ZoneFormErrors {
  name?: string;
  center?: string;
  radiusKm?: string;
  alertMinSeverity?: string;
}

export type ZoneInputResult =
  { success: true; data: ZoneInput } | { success: false; errors: ZoneFormErrors };

/** Reads and validates a submitted zone form. */
export function parseZoneInput(form: FormData): ZoneInputResult {
  const result = zoneInputSchema.safeParse({
    name: getText(form, "name"),
    longitude: toNumber(getText(form, "longitude")),
    latitude: toNumber(getText(form, "latitude")),
    radiusKm: toNumber(getText(form, "radiusKm")),
    alertMinSeverity: getText(form, "alertMinSeverity"),
  });
  if (result.success) {
    return { success: true, data: result.data };
  }

  const { fieldErrors } = z.flattenError(result.error);
  return {
    success: false,
    errors: {
      name: fieldErrors.name?.[0],
      center: (fieldErrors.longitude ?? fieldErrors.latitude)?.[0],
      radiusKm: fieldErrors.radiusKm?.[0],
      alertMinSeverity: fieldErrors.alertMinSeverity?.[0],
    },
  };
}

/** Whether a value has the shape of a zone identifier. */
export function isZoneId(value: string): boolean {
  return z.uuid().safeParse(value).success;
}

/** `Number("")` is 0, which would place a missing centre on the equator. */
function toNumber(text: string): number {
  return text === "" ? Number.NaN : Number(text);
}
