import type { HazardKind } from "@hazardwatch/db/constants";
import {
  FireIcon,
  HurricaneIcon,
  MountainsIcon,
  ThermometerHotIcon,
  WaveformIcon,
  WavesIcon,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";

/** One icon per kind of hazard, from the Phosphor set. */
export const hazardKindIcons: Record<HazardKind, Icon> = {
  earthquake: WaveformIcon,
  wildfire: FireIcon,
  tropical_cyclone: HurricaneIcon,
  flood: WavesIcon,
  volcano: MountainsIcon,
  drought: ThermometerHotIcon,
};
