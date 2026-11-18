"use client";

import { useEffect, useRef } from "react";

import { decodeLandMask, landMask } from "./land-mask";

/**
 * An event raised as a peak: its longitude and latitude, its severity rank
 * from 0 (minor) to 3 (extreme), and 1 when it started recently.
 */
export type EarthEvent = readonly [
  longitude: number,
  latitude: number,
  rank: number,
  recent: number,
];

const { columns: COLUMNS, rows: ROWS, north: NORTH, south: SOUTH } = landMask;

/** The view turns eastwards like the planet, a full turn in about eight minutes. */
const DRIFT_DEGREES_PER_SECOND = 0.75;
/** Longitude in the middle of the first frame: Europe and Africa. */
const START_LONGITUDE = 15;
/** Degrees between two points of a line. */
const POINT_SPACING_DEGREES = 1.25;
/** Width of a peak, in degrees. */
const PEAK_WIDTH_DEGREES = 1.1;
/** Lines appear from north to south over about this long when the page opens. */
const INTRO_ROW_DELAY_MS = 18;
const INTRO_ROW_MS = 900;

const wrap = (value: number, size: number) => ((value % size) + size) % size;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const easeOutCubic = (value: number) => 1 - (1 - value) ** 3;

/** Turns the coastlines of the mask into slopes, wrapping around the date line. */
function smoothLand(cells: Float32Array): Float32Array {
  const across = new Float32Array(cells.length);
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLUMNS; col++) {
      let sum = 0;
      for (let k = -2; k <= 2; k++) {
        sum += cells[row * COLUMNS + wrap(col + k, COLUMNS)]!;
      }
      across[row * COLUMNS + col] = sum / 5;
    }
  }
  const smooth = new Float32Array(cells.length);
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLUMNS; col++) {
      let sum = 0;
      let count = 0;
      for (let k = -1; k <= 1; k++) {
        if (row + k >= 0 && row + k < ROWS) {
          sum += across[(row + k) * COLUMNS + col]!;
          count++;
        }
      }
      smooth[row * COLUMNS + col] = sum / count;
    }
  }
  return smooth;
}

/** How much land lies under a point of a line, from 0 to 1. */
function landAt(land: Float32Array, row: number, longitude: number): number {
  const x = wrap(((longitude + 180) / 360) * COLUMNS - 0.5, COLUMNS);
  const left = Math.floor(x);
  const right = (left + 1) % COLUMNS;
  const fraction = x - left;
  return land[row * COLUMNS + left]! * (1 - fraction) + land[row * COLUMNS + right]! * fraction;
}

interface Peak {
  longitude: number;
  /** Position between the lines, as a fractional line index. */
  row: number;
  /** Height relative to the line spacing. */
  height: number;
  recent: boolean;
  /** Drawn in the accent colour: moderate or worse, or recent. */
  accent: boolean;
  /** Offset of its pulse, so that peaks do not beat together. */
  phase: number;
}

function toPeaks(events: readonly EarthEvent[]): Peak[] {
  return events
    .map(([longitude, latitude, rank, recent]) => ({
      longitude,
      row: ((NORTH - latitude) / (NORTH - SOUTH)) * ROWS - 0.5,
      height: 0.55 + rank * 0.7 + (recent ? 0.5 : 0),
      recent: recent === 1,
      accent: rank >= 1 || recent === 1,
      phase: wrap(longitude * 12.9898 + latitude * 78.233, Math.PI * 2),
    }))
    .filter((peak) => peak.row > -1 && peak.row < ROWS);
}

interface SeismicEarthProps {
  events: readonly EarthEvent[];
  className?: string;
}

/**
 * The planet drawn as a seismogram: one line per band of latitude, raised
 * where there is land, with a peak at every event. The view turns slowly
 * eastwards, recent events pulse, and lines swell under the mouse. Users
 * who prefer reduced motion get a still picture.
 *
 * The canvas takes the background colour of its parent, which must be set,
 * its text colour for the lines, and the accent colour for the peaks.
 */
export function SeismicEarth({ events, className = "" }: SeismicEarthProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    const context = canvas?.getContext("2d");
    if (!canvas || !host || !context) {
      return;
    }

    const land = smoothLand(decodeLandMask());
    const peaks = toPeaks(events);
    const background = getComputedStyle(host).backgroundColor;
    const lineColor = getComputedStyle(canvas).color;
    const accent =
      getComputedStyle(document.documentElement).getPropertyValue("--color-accent").trim() ||
      "#f97c3d";
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let points = 0;
    let ys = new Float32Array(0);
    let grounds = new Float32Array(0);
    let lift: Float32Array[] = [];
    const startedAt = performance.now();

    // The pointer eases towards where the mouse is, and fades when it leaves.
    const pointer = { x: 0, y: 0, targetX: 0, targetY: 0, strength: 0, active: false };

    function resize() {
      const rect = host!.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      // Sharp on high density screens, without drawing millions of pixels.
      let ratio = Math.min(window.devicePixelRatio || 1, 2);
      if (width * height * ratio * ratio > 5_000_000) {
        ratio = Math.sqrt(5_000_000 / (width * height));
      }
      canvas!.width = Math.round(width * ratio);
      canvas!.height = Math.round(height * ratio);
      context!.setTransform(ratio, 0, 0, ratio, 0, 0);

      const span = clamp(width / 4, 140, 360);
      points = Math.ceil(span / POINT_SPACING_DEGREES) + 1;
      ys = new Float32Array(points);
      grounds = new Float32Array(points);
      lift = Array.from({ length: ROWS }, () => new Float32Array(points));
    }

    function draw(now: number) {
      const seconds = reducedMotion ? 0 : (now - startedAt) / 1000;
      const elapsed = reducedMotion ? Infinity : now - startedAt;

      context!.fillStyle = background;
      context!.fillRect(0, 0, width, height);

      const top = height * 0.12;
      // On narrow screens the text sits below the field rather than over it.
      const bottom = height * (width < 768 ? 0.56 : 0.9);
      const spacing = (bottom - top) / (ROWS - 1);
      const span = clamp(width / 4, 140, 360);
      const degreesPerPoint = span / (points - 1);
      const pixelsPerPoint = width / (points - 1);
      const west = START_LONGITUDE + seconds * DRIFT_DEGREES_PER_SECOND - span / 2;
      const maxRise = spacing * 7;

      // Peaks around each event. Close events share a peak rather than stack up.
      for (const buffer of lift) {
        buffer.fill(0);
      }
      const sigma = PEAK_WIDTH_DEGREES / degreesPerPoint;
      const reach = Math.ceil(sigma * 3);
      for (const peak of peaks) {
        const offset = wrap(peak.longitude - west, 360);
        if (offset > span + PEAK_WIDTH_DEGREES * 3) {
          continue;
        }
        const pulse = peak.recent
          ? 0.7 + 0.5 * (0.5 + 0.5 * Math.sin(seconds * 2.6 + peak.phase))
          : 0.92 + 0.08 * Math.sin(seconds * 1.1 + peak.phase);
        const amplitude = peak.height * spacing * 2 * pulse;
        const center = offset / degreesPerPoint;
        for (let row = Math.floor(peak.row - 1); row <= Math.ceil(peak.row + 1); row++) {
          if (row < 0 || row >= ROWS) {
            continue;
          }
          const across = Math.exp(-((row - peak.row) ** 2) / 0.35);
          const buffer = lift[row]!;
          for (let k = -reach; k <= reach; k++) {
            const index = Math.round(center) + k;
            if (index >= 0 && index < points) {
              buffer[index] = Math.max(
                buffer[index]!,
                amplitude * across * Math.exp(-((index - center) ** 2) / (2 * sigma * sigma)),
              );
            }
          }
        }
      }

      if (!reducedMotion) {
        pointer.strength += ((pointer.active ? 1 : 0) - pointer.strength) * 0.06;
        pointer.x += (pointer.targetX - pointer.x) * 0.16;
        pointer.y += (pointer.targetY - pointer.y) * 0.16;
      }
      const lensRadius = Math.max(width, height) * 0.09;

      context!.lineJoin = "round";
      for (let row = 0; row < ROWS; row++) {
        const intro = easeOutCubic(
          clamp((elapsed - row * INTRO_ROW_DELAY_MS) / INTRO_ROW_MS, 0, 1),
        );
        if (intro <= 0) {
          continue;
        }
        const base = top + row * spacing;
        const buffer = lift[row]!;

        for (let index = 0; index < points; index++) {
          const x = index * pixelsPerPoint;
          const ground = landAt(land, row, west + index * degreesPerPoint);
          grounds[index] = ground;
          // A slow swell keeps the oceans alive without hiding the coasts.
          const swell =
            (Math.sin(x * 0.017 + seconds * 0.5 + row * 0.9) +
              Math.sin(x * 0.006 - seconds * 0.33 + row * 0.37)) *
            spacing *
            0.1 *
            (1 - ground * 0.6);
          let rise = ground * spacing * 3 + swell + buffer[index]!;
          if (pointer.strength > 0.001) {
            const distance = (x - pointer.x) ** 2 + (base - pointer.y) ** 2;
            rise += pointer.strength * spacing * 2.2 * Math.exp(-distance / (2 * lensRadius ** 2));
          }
          ys[index] = base - maxRise * Math.tanh((rise * intro) / maxRise);
        }

        // Each line hides the lines behind it, above, where it rises.
        context!.beginPath();
        context!.moveTo(0, base + 1);
        for (let index = 0; index < points; index++) {
          context!.lineTo(index * pixelsPerPoint, ys[index]!);
        }
        context!.lineTo(width, base + 1);
        context!.closePath();
        context!.globalAlpha = 1;
        context!.fillStyle = background;
        context!.fill();

        context!.beginPath();
        for (let index = 0; index < points; index++) {
          context!.lineTo(index * pixelsPerPoint, ys[index]!);
        }
        // Lines fade towards the poles, and shine brighter over land.
        const fade = Math.sin((Math.PI * (row + 1)) / (ROWS + 1)) ** 0.7;
        context!.globalAlpha = (0.1 + 0.32 * fade) * intro;
        context!.strokeStyle = lineColor;
        context!.lineWidth = 1;
        context!.stroke();

        context!.beginPath();
        for (let index = 0; index < points; index++) {
          if (grounds[index]! < 0.4) {
            continue;
          }
          if (index === 0 || grounds[index - 1]! < 0.4) {
            context!.moveTo(index * pixelsPerPoint, ys[index]!);
          } else {
            context!.lineTo(index * pixelsPerPoint, ys[index]!);
          }
        }
        context!.globalAlpha = (0.25 + 0.6 * fade) * intro;
        context!.lineWidth = 1.1;
        context!.stroke();

        // Peaks of this line in the accent colour, and a glint on recent ones.
        context!.strokeStyle = accent;
        context!.fillStyle = accent;
        for (const peak of peaks) {
          if (!peak.accent || Math.round(peak.row) !== row) {
            continue;
          }
          const center = Math.round(wrap(peak.longitude - west, 360) / degreesPerPoint);
          if (center < 0 || center >= points) {
            continue;
          }
          context!.beginPath();
          for (
            let index = Math.max(0, center - reach);
            index <= Math.min(points - 1, center + reach);
            index++
          ) {
            context!.lineTo(index * pixelsPerPoint, ys[index]!);
          }
          context!.globalAlpha = 0.9 * intro;
          context!.lineWidth = 1.25;
          context!.stroke();
          if (peak.recent) {
            const glint = 0.5 + 0.5 * Math.sin(seconds * 2.6 + peak.phase);
            context!.beginPath();
            context!.arc(center * pixelsPerPoint, ys[center]!, 1.6 + glint, 0, Math.PI * 2);
            context!.globalAlpha = (0.55 + 0.45 * glint) * intro;
            context!.fill();
          }
        }
      }

      // The field dissolves into the background on both sides.
      context!.globalAlpha = 1;
      const edge = width * 0.08;
      for (const [from, to] of [
        [0, edge],
        [width, width - edge],
      ] as const) {
        const gradient = context!.createLinearGradient(from, 0, to, 0);
        gradient.addColorStop(0, background);
        gradient.addColorStop(1, "transparent");
        context!.fillStyle = gradient;
        context!.fillRect(Math.min(from, to), 0, edge, height);
      }
    }

    let frame = 0;
    let running = false;
    const loop = (now: number) => {
      draw(now);
      frame = requestAnimationFrame(loop);
    };
    const start = () => {
      if (!running && !reducedMotion) {
        running = true;
        frame = requestAnimationFrame(loop);
      }
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(frame);
    };

    resize();
    draw(performance.now());

    const resizeObserver = new ResizeObserver(() => {
      resize();
      draw(performance.now());
    });
    resizeObserver.observe(host);

    // Nothing moves while the field is scrolled out of view.
    const visibility = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        start();
      } else {
        stop();
      }
    });
    visibility.observe(host);

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") {
        return;
      }
      const rect = canvas.getBoundingClientRect();
      pointer.targetX = event.clientX - rect.left;
      pointer.targetY = event.clientY - rect.top;
      if (!pointer.active) {
        pointer.x = pointer.targetX;
        pointer.y = pointer.targetY;
        pointer.active = true;
      }
    };
    const onPointerLeave = () => {
      pointer.active = false;
    };
    host.addEventListener("pointermove", onPointerMove);
    host.addEventListener("pointerleave", onPointerLeave);

    return () => {
      stop();
      resizeObserver.disconnect();
      visibility.disconnect();
      host.removeEventListener("pointermove", onPointerMove);
      host.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [events]);

  return <canvas ref={canvasRef} aria-hidden className={className} />;
}
