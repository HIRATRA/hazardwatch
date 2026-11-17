import { describe, expect, it } from "vitest";

import { MAX_ZONE_NAME_LENGTH, parseZoneInput } from "./input";

type ZoneField =
  "name" | "longitude" | "latitude" | "radiusKm" | "alertMinSeverity" | "emailAlerts";

/** A submitted zone form. A null field is left out, as an unchecked checkbox is. */
function zoneForm(fields: Partial<Record<ZoneField, string | null>>) {
  const form = new FormData();
  const values = {
    name: "Lisbon office",
    longitude: "-9.1393",
    latitude: "38.7223",
    radiusKm: "100",
    alertMinSeverity: "moderate",
    emailAlerts: "on",
    ...fields,
  };
  for (const [name, value] of Object.entries(values)) {
    if (value !== null) {
      form.set(name, value);
    }
  }
  return form;
}

describe("parseZoneInput", () => {
  it("reads a valid zone", () => {
    expect(parseZoneInput(zoneForm({ name: "  Lisbon office " }))).toEqual({
      success: true,
      data: {
        name: "Lisbon office",
        longitude: -9.1393,
        latitude: 38.7223,
        radiusKm: 100,
        alertMinSeverity: "moderate",
        emailAlerts: true,
      },
    });
  });

  it("keeps alerts in the app when the email box is unchecked", () => {
    expect(parseZoneInput(zoneForm({ emailAlerts: null }))).toMatchObject({
      success: true,
      data: { emailAlerts: false },
    });
  });

  it("turns alerts off", () => {
    expect(parseZoneInput(zoneForm({ alertMinSeverity: "off" }))).toMatchObject({
      success: true,
      data: { alertMinSeverity: null },
    });
  });

  it.each(["", "loud", "Moderate"])("rejects an alert threshold of %j", (alertMinSeverity) => {
    expect(parseZoneInput(zoneForm({ alertMinSeverity }))).toEqual({
      success: false,
      errors: { alertMinSeverity: "Choose which events to be alerted about." },
    });
  });

  it("requires a name", () => {
    expect(parseZoneInput(zoneForm({ name: "   " }))).toEqual({
      success: false,
      errors: { name: "Give the zone a name." },
    });
  });

  it("limits the length of the name", () => {
    const name = "x".repeat(MAX_ZONE_NAME_LENGTH + 1);

    expect(parseZoneInput(zoneForm({ name }))).toMatchObject({
      success: false,
      errors: { name: "Keep the name to 60 characters or fewer." },
    });
    expect(parseZoneInput(zoneForm({ name: name.slice(1) })).success).toBe(true);
  });

  it("requires a centre rather than defaulting to 0, 0", () => {
    expect(parseZoneInput(zoneForm({ longitude: "", latitude: "" }))).toEqual({
      success: false,
      errors: { center: "Pick the centre of the zone on the map." },
    });
  });

  it.each([
    { longitude: "180.5" },
    { longitude: "-181" },
    { latitude: "91" },
    { latitude: "north" },
    { latitude: "Infinity" },
  ])("rejects a centre off the globe: %o", (fields) => {
    expect(parseZoneInput(zoneForm(fields))).toMatchObject({
      success: false,
      errors: { center: "Pick the centre of the zone on the map." },
    });
  });

  it.each(["0", "1001", "12.5", "", "far"])("rejects a radius of %j", (radiusKm) => {
    expect(parseZoneInput(zoneForm({ radiusKm }))).toEqual({
      success: false,
      errors: { radiusKm: "Choose a radius between 1 and 1000 km." },
    });
  });

  it("reports every invalid field at once", () => {
    expect(parseZoneInput(zoneForm({ name: "", latitude: "", radiusKm: "0" }))).toEqual({
      success: false,
      errors: {
        name: "Give the zone a name.",
        center: "Pick the centre of the zone on the map.",
        radiusKm: "Choose a radius between 1 and 1000 km.",
      },
    });
  });
});
