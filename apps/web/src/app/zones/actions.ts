"use server";

import { and, eq, watchZones } from "@hazardwatch/db";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import {
  isZoneId,
  MAX_ZONES_PER_USER,
  parseZoneInput,
  type ZoneFormErrors,
  type ZoneInput,
} from "@/lib/zones/input";
import { countZones } from "@/lib/zones/queries";

export interface ZoneFormState {
  /** Messages for each invalid field, plus `form` for the form as a whole. */
  errors: ZoneFormErrors & { form?: string };
}

function toRow({ name, longitude, latitude, radiusKm }: ZoneInput) {
  return { name, radiusKm, center: { x: longitude, y: latitude } };
}

export async function createZone(_state: ZoneFormState, form: FormData): Promise<ZoneFormState> {
  const { user } = await requireSession();
  const input = parseZoneInput(form);
  if (!input.success) {
    return { errors: input.errors };
  }

  // Two simultaneous requests may both pass this check. Going one zone over
  // the limit is harmless, so it does not justify locking.
  if ((await countZones(user.id)) >= MAX_ZONES_PER_USER) {
    return {
      errors: {
        form: `You can watch up to ${MAX_ZONES_PER_USER} zones. Delete one to add another.`,
      },
    };
  }

  await db.insert(watchZones).values({ userId: user.id, ...toRow(input.data) });
  redirect("/zones");
}

export async function updateZone(
  id: string,
  _state: ZoneFormState,
  form: FormData,
): Promise<ZoneFormState> {
  const { user } = await requireSession();
  const input = parseZoneInput(form);
  if (!input.success) {
    return { errors: input.errors };
  }

  const updated = isZoneId(id)
    ? await db
        .update(watchZones)
        .set(toRow(input.data))
        .where(and(eq(watchZones.id, id), eq(watchZones.userId, user.id)))
        .returning({ id: watchZones.id })
    : [];
  if (updated.length === 0) {
    return { errors: { form: "This zone no longer exists." } };
  }
  redirect("/zones");
}

export async function deleteZone(id: string): Promise<void> {
  const { user } = await requireSession();
  if (isZoneId(id)) {
    await db.delete(watchZones).where(and(eq(watchZones.id, id), eq(watchZones.userId, user.id)));
  }
  redirect("/zones");
}
