import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

// Environment variables are shared across the monorepo in a single root .env file.
const rootEnvFile = fileURLToPath(new URL("../../.env", import.meta.url));
if (existsSync(rootEnvFile)) {
  process.loadEnvFile(rootEnvFile);
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: true,
  headers: () =>
    Promise.resolve([
      {
        // Browsers check for a new service worker on every visit, which a
        // cached copy would hide.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
    ]),
};

export default nextConfig;
