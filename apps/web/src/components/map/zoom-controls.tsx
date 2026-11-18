"use client";

import { GlobeHemisphereEastIcon, MinusIcon, PlusIcon } from "@phosphor-icons/react/dist/ssr";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import type { Map as MapLibreMap } from "maplibre-gl";

import { showWholeGlobe } from "./maplibre";

interface ZoomControlsProps {
  /** The map, read when a button is pressed since it is created after the first render. */
  getMap: () => MapLibreMap | null;
  /** Offer a button back to the whole globe. */
  withWholeGlobe?: boolean;
  className?: string;
}

const buttonClass =
  "focus-visible:ring-accent grid size-9 place-items-center text-neutral-300 transition-[background-color,color,transform] outline-none hover:bg-white/[0.07] hover:text-neutral-50 focus-visible:ring-2 focus-visible:ring-inset active:scale-90";

function ControlButton({
  label,
  Icon,
  onPress,
}: {
  label: string;
  Icon: PhosphorIcon;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onPress}
      className={buttonClass}
    >
      <Icon aria-hidden className="size-4" weight="bold" />
    </button>
  );
}

/**
 * Zoom buttons matching the rest of the map's controls. The map keeps its
 * own keyboard shortcuts, plus and minus, as well.
 */
export function ZoomControls({
  getMap,
  withWholeGlobe = false,
  className = "",
}: ZoomControlsProps) {
  return (
    <div
      role="group"
      aria-label="Zoom"
      className={`border-border bg-surface/85 flex flex-col divide-y divide-white/10 overflow-hidden rounded-xl border shadow-lg shadow-black/30 backdrop-blur ${className}`}
    >
      <ControlButton label="Zoom in" Icon={PlusIcon} onPress={() => getMap()?.zoomIn()} />
      <ControlButton label="Zoom out" Icon={MinusIcon} onPress={() => getMap()?.zoomOut()} />
      {withWholeGlobe && (
        <ControlButton
          label="Show the whole globe"
          Icon={GlobeHemisphereEastIcon}
          onPress={() => {
            const map = getMap();
            if (map) {
              showWholeGlobe(map);
            }
          }}
        />
      )}
    </div>
  );
}
