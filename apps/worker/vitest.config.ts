import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Run separately with `pnpm test:integration`, since they need PostgreSQL.
    exclude: ["src/**/*.integration.test.ts"],
  },
});
