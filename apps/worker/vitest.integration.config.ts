import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

// Locally, DATABASE_URL comes from the root .env. Variables already set, as
// in CI, take precedence.
const rootEnvFile = fileURLToPath(new URL("../../.env", import.meta.url));
if (existsSync(rootEnvFile)) {
  process.loadEnvFile(rootEnvFile);
}

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.integration.test.ts"],
    globalSetup: ["./src/testing/database-setup.ts"],
    // Test files share one database and reset it between tests.
    fileParallelism: false,
  },
});
