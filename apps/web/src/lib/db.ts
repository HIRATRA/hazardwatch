import "server-only";

import { createDb, type Database } from "@hazardwatch/db";

import { env } from "./env";

// Reuse a single connection pool across hot reloads in development.
const globalForDb = globalThis as unknown as { db?: Database };

export const db = globalForDb.db ?? createDb(env.DATABASE_URL);

if (env.NODE_ENV !== "production") {
  globalForDb.db = db;
}
