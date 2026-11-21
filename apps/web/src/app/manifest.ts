import type { MetadataRoute } from "next";

import { appIconBackground } from "@/lib/app-icon";

/**
 * Lets browsers install HazardWatch as an app, which iPhones and iPads
 * require before they deliver push notifications.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HazardWatch",
    short_name: "HazardWatch",
    description: "Natural hazards in real time, and alerts for the places you care about.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: appIconBackground,
    theme_color: appIconBackground,
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
