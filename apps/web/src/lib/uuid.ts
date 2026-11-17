import { z } from "zod";

const uuidSchema = z.uuid();

/**
 * Whether a value has the shape of a UUID. Check identifiers that come from
 * the URL or a form before querying, since PostgreSQL rejects malformed ones
 * instead of matching nothing.
 */
export function isUuid(value: string): boolean {
  return uuidSchema.safeParse(value).success;
}
