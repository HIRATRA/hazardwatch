import { z } from "zod";

/** One fire detection by a VIIRS instrument: a 375 m pixel hotter than its surroundings. */
export interface Detection {
  latitude: number;
  longitude: number;
  /** When the satellite passed over, in UTC. */
  detectedAt: Date;
  /** Satellite code, such as `N20` for NOAA-20. */
  satellite: string;
  confidence: "low" | "nominal" | "high";
  /** Fire radiative power, in megawatts: the energy the fire gives off. */
  frp: number;
}

const COLUMNS = ["latitude", "longitude", "acq_date", "acq_time", "satellite", "confidence", "frp"];

const rowSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  acq_date: z.iso.date(),
  // Hours and minutes in UTC, such as 0034.
  acq_time: z.string().regex(/^\d{4}$/),
  satellite: z.string().min(1),
  confidence: z.enum(["low", "nominal", "high"]),
  frp: z.coerce.number().nonnegative(),
});

export interface ParseResult {
  detections: Detection[];
  /** Rows that could not be read and were skipped. */
  skipped: number;
}

/**
 * Reads a FIRMS VIIRS active fire CSV file. Throws when the header lacks a
 * required column, since the format would have changed; skips the rows that
 * cannot be read.
 */
export function parseDetections(csv: string): ParseResult {
  const [header = "", ...lines] = csv.split(/\r?\n/);
  const columns = header.split(",");
  const indexes = COLUMNS.map((name) => columns.indexOf(name));
  if (indexes.some((index) => index === -1)) {
    throw new Error(`Unexpected FIRMS file format, header: ${header.slice(0, 200)}`);
  }

  const detections: Detection[] = [];
  let skipped = 0;
  for (const line of lines) {
    if (line.trim() === "") {
      continue;
    }
    const fields = line.split(",");
    const row = rowSchema.safeParse(
      Object.fromEntries(COLUMNS.map((name, column) => [name, fields[indexes[column] ?? -1]])),
    );
    if (!row.success) {
      skipped += 1;
      continue;
    }
    const { acq_date: date, acq_time: time, ...detection } = row.data;
    detections.push({
      ...detection,
      detectedAt: new Date(`${date}T${time.slice(0, 2)}:${time.slice(2)}:00Z`),
    });
  }
  return { detections, skipped };
}
