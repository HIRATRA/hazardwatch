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
};

export default nextConfig;
