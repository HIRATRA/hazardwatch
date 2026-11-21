"use client";

import { defaultAlertMinSeverity } from "@hazardwatch/db/constants";
import { ArrowLeftIcon, CircleNotchIcon, CrosshairIcon } from "@phosphor-icons/react/dist/ssr";
import type { Route } from "next";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useActionState, useState, type ReactNode } from "react";

import type { ZoneFormState } from "@/app/zones/actions";
import { FormAlert } from "@/components/auth/form-parts";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { alertThresholdLabels, formatRadius } from "@/lib/zones/format";
import { roundCoordinate } from "@/lib/zones/geometry";
import {
  alertThresholdChoices,
  ALERTS_OFF,
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
    loading: () => <div className="bg-ink absolute inset-0 animate-pulse" />,
  },
);

const initialState: ZoneFormState = { errors: {} };

const alertOptions = alertThresholdChoices.map((value) => ({
  value,
  label: alertThresholdLabels[value],
}));

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
  const [alertMinSeverity, setAlertMinSeverity] = useState<string>(
    zone ? (zone.alertMinSeverity ?? ALERTS_OFF) : defaultAlertMinSeverity,
  );
  const [emailAlerts, setEmailAlerts] = useState(zone?.emailAlerts ?? true);
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
      <div className="bg-ink order-2 min-h-0 flex-1 overflow-y-auto border-t border-white/10 md:order-1 md:w-[26rem] md:flex-none md:border-t-0 md:border-r">
        <form action={formAction} className="flex flex-col gap-6 p-6 md:p-8">
          <div>
            <Link
              href={cancelHref}
              className="group text-muted focus-visible:ring-accent inline-flex items-center gap-1.5 rounded-sm text-sm transition-colors outline-none hover:text-neutral-100 focus-visible:ring-2"
            >
              <ArrowLeftIcon
                aria-hidden
                className="size-3.5 transition-transform group-hover:-translate-x-0.5"
              />
              Back
            </Link>
            <h1 className="mt-5 text-3xl font-light tracking-tight">{title}</h1>
            <p className="text-muted mt-2 text-sm leading-relaxed text-pretty">
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
            onValueChange={(value) => setRadiusKm(Number(value))}
            error={errors.radiusKm}
          />

          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 font-mono text-xs tracking-[0.2em] text-neutral-400 uppercase">
              Centre
            </legend>
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
                className="focus-visible:ring-accent inline-flex h-8 items-center gap-1.5 rounded-full border border-white/10 px-3 text-xs font-medium text-neutral-200 transition-[border-color,background-color,transform] outline-none hover:border-white/25 hover:bg-white/5 focus-visible:ring-2 active:scale-[0.98] disabled:opacity-60"
              >
                {locationStatus === "locating" ? (
                  <CircleNotchIcon aria-hidden className="size-3.5 animate-spin" weight="bold" />
                ) : (
                  <CrosshairIcon aria-hidden className="text-accent size-3.5" />
                )}
                {locationStatus === "locating" ? "Locating…" : "Use my location"}
              </button>
              {locationStatus === "failed" && (
                <p role="status" className="text-muted text-xs">
                  Your location is unavailable. Click the map instead.
                </p>
              )}
            </div>
          </fieldset>

          <Select
            label="Alert me about"
            name="alertMinSeverity"
            value={alertMinSeverity}
            options={alertOptions}
            onValueChange={setAlertMinSeverity}
            error={errors.alertMinSeverity}
          />

          <label className="-mt-1 flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-sm transition-colors hover:border-white/20 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
            <input
              type="checkbox"
              name="emailAlerts"
              checked={emailAlerts}
              onChange={(event) => setEmailAlerts(event.target.checked)}
              disabled={alertMinSeverity === ALERTS_OFF}
              className="accent-accent mt-0.5 size-4 shrink-0"
            />
            <span className="text-neutral-100">
              Send these alerts by email too
              <span className="text-muted block text-xs">
                Once your email address is confirmed.
              </span>
            </span>
          </label>
          {/* A disabled checkbox is not submitted. Keep the choice for when alerts come back on. */}
          {alertMinSeverity === ALERTS_OFF && emailAlerts && (
            <input type="hidden" name="emailAlerts" value="on" />
          )}

          {errors.form && <FormAlert message={errors.form} />}

          <div className="flex items-center gap-5 pt-1">
            <Button type="submit" disabled={pending} className="h-11 px-6">
              {pending && (
                <CircleNotchIcon aria-hidden className="size-4 animate-spin" weight="bold" />
              )}
              {pending ? "Saving…" : submitLabel}
            </Button>
            <Link
              href={cancelHref}
              className="text-muted focus-visible:ring-accent rounded-sm text-sm transition-colors outline-none hover:text-neutral-100 focus-visible:ring-2"
            >
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
