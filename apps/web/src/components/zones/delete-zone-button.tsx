"use client";

import { useState, useTransition } from "react";

import { deleteZone } from "@/app/zones/actions";
import { Button } from "@/components/ui/button";

interface DeleteZoneButtonProps {
  zoneId: string;
  zoneName: string;
}

/** Deletes a zone after an explicit confirmation. */
export function DeleteZoneButton({ zoneId, zoneName }: DeleteZoneButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <Button variant="ghost" onClick={() => setConfirming(true)}>
        Delete zone
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm">Delete “{zoneName}”? This cannot be undone.</p>
      <div className="flex gap-3">
        <Button
          variant="danger"
          disabled={pending}
          onClick={() => startTransition(() => deleteZone(zoneId))}
        >
          {pending ? "Deleting…" : "Delete"}
        </Button>
        {/* Focused first, so that confirming takes a deliberate move. */}
        <Button variant="ghost" disabled={pending} onClick={() => setConfirming(false)} autoFocus>
          Cancel
        </Button>
      </div>
    </div>
  );
}
