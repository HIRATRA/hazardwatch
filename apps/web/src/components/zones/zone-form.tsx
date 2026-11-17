"use client";

import type { Route } from "next";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useActionState, useState, type ReactNode } from "react";

import type { ZoneFormState } from "@/app/zones/actions";
import { Button, buttonClassName } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { formatRadius } from "@/lib/zones/format";
import { roundCoordinate } from "@/lib/zones/geometry";
import {
  DEFAULT_ZONE_RADIUS_KM,
  MAX_ZONE_NAME_LENGTH,
  zoneRadiusOptionsKm,
} from "@/lib/zones/input";
import type { Zone } from "@/lib/zones/types";

import type { ZoneCenter } from "./zone-picker-map";

// WebGL only exists in the browser, and loading MapLibre separately keeps it
// out of the initial JavaScript bundle.
const ZonePickerMap = dynamic(
  () => import("./zone-picker-map").then((module) => module.ZonePickerMap),
  {
    ssr: false,
    loading: () => <div className="bg-surface-raised absolute inset-0 animate-pulse" />,
  },
);

const initialState: ZoneFormState = { errors: {} };

interface ZoneFormProps<CancelRoute extends string> {
  title: string;
  /** Server action that saves the zone and redirects on success. */
  action: (state: ZoneFormState, form: FormData) => Promise<ZoneFormState>;
  submitLabel: string;
  cancelHref: Route<CancelRoute>;
  /** Zone being edited, if any. */
  zone?: Zone;
  /** Shown below the form, outside of it. */
  children?: ReactNode;
}

/**
 * Form to create or edit a zone, next to a map that previews it. The centre
 * is set by clicking the map, or typed in for keyboard users and precision.
 */
export function ZoneForm<CancelRoute extends string>({
  title,
  action,
  submitLabel,
  cancelHref,
  zone,
  children,
}: ZoneFormProps<CancelRoute>) {
  const [state, formAction, pending] = useActionState(action, initialState);
  // Controlled fields keep their values when the server rejects the form.
  const [name, setName] = useState(zone?.name ?? "");
  const [radiusKm, setRadiusKm] = useState(zone?.radiusKm ?? DEFAULT_ZONE_RADIUS_KM);
  const [latitude, setLatitude] = useState(zone ? String(zone.latitude) : "");
  const [longitude, setLongitude] = useState(zone ? String(zone.longitude) : "");
  const [locationStatus, setLocationStatus] = useState<"idle" | "locating" | "failed">("idle");

  const center = parseCenter(latitude, longitude);
  const { errors } = state;

  // Keeps a radius set outside of this form selectable.
  const radiusOptions = [...new Set([...zoneRadiusOptionsKm, radiusKm])]
    .sort((a, b) => a - b)
    .map((value) => ({ value: String(value), label: formatRadius(value) }));

  function pick({ latitude, longitude }: ZoneCenter) {
    setLatitude(String(latitude));
    setLongitude(String(longitude));
  }

  function locate() {
    setLocationStatus("locating");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        pick({
          latitude: roundCoordinate(coords.latitude),
          longitude: roundCoordinate(coords.longitude),
        });
        setLocationStatus("idle");
      },
      () => setLocationStatus("failed"),
      { timeout: 10_000 },
    );
  }

  const centerErrorProps = errors.center
    ? { "aria-invalid": true, "aria-describedby": "center-error" }
    : {};

  return (
    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      <div className="border-border order-2 min-h-0 flex-1 overflow-y-auto border-t md:order-1 md:w-96 md:flex-none md:border-t-0 md:border-r">
        <form action={formAction} className="flex flex-col gap-5 p-6">
          <div>
            <h1 className="text-xl font-semibold">{title}</h1>
            <p className="text-muted mt-1 text-sm">
              Click the map to place the centre of the zone. Events located within the radius belong
              to it.
            </p>
          </div>

          <Field
            label="Name"
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Home, Lisbon office…"
            maxLength={MAX_ZONE_NAME_LENGTH}
            autoComplete="off"
            required
            error={errors.name}
          />

          <Select
            label="Radius"
            name="radiusKm"
            value={String(radiusKm)}
            options={radiusOptions}
            onChange={(event) => setRadiusKm(Number(event.target.value))}
            error={errors.radiusKm}
          />

          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1.5 text-sm font-medium">Centre</legend>
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Latitude"
                name="latitude"
                type="number"
                step="any"
                min={-90}
                max={90}
                value={latitude}
                onChange={(event) => setLatitude(event.target.value)}
                required
                {...centerErrorProps}
              />
              <Field
                label="Longitude"
                name="longitude"
                type="number"
                step="any"
                min={-180}
                max={180}
                value={longitude}
                onChange={(event) => setLongitude(event.target.value)}
                required
                {...centerErrorProps}
              />
            </div>
            {errors.center && (
              <p id="center-error" className="text-danger text-xs">
                {errors.center}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <button
                type="button"
                onClick={locate}
                disabled={locationStatus === "locating"}
                className="text-accent focus-visible:ring-accent rounded text-sm outline-none hover:underline focus-visible:ring-2 disabled:opacity-60"
              >
                {locationStatus === "locating" ? "Locating…" : "Use my location"}
              </button>
              {locationStatus === "failed" && (
                <p role="status" className="text-muted text-xs">
                  Your location is unavailable. Click the map instead.
                </p>
              )}
            </div>
          </fieldset>

          {errors.form && (
            <p role="alert" className="text-danger text-sm">
              {errors.form}
            </p>
          )}

          <div className="flex gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : submitLabel}
            </Button>
            <Link href={cancelHref} className={buttonClassName("ghost")}>
              Cancel
            </Link>
          </div>
        </form>
        {children}
      </div>

      <section
        aria-label="Map"
        className="relative order-1 h-[45dvh] shrink-0 md:order-2 md:h-auto md:flex-1"
      >
        <ZonePickerMap center={center} radiusKm={radiusKm} onPick={pick} />
      </section>
    </div>
  );
}

/** The centre typed in the form, or null while it is incomplete or off the globe. */
function parseCenter(latitudeText: string, longitudeText: string): ZoneCenter | null {
  if (latitudeText.trim() === "" || longitudeText.trim() === "") {
    return null;
  }
  const latitude = Number(latitudeText);
  const longitude = Number(longitudeText);
  const valid =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180;
  return valid ? { latitude, longitude } : null;
}
