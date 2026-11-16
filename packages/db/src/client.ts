import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema/index.js";

export interface CreateDbOptions {
  /** Maximum number of pooled connections. Keep this low on serverless platforms. */
  maxConnections?: number;
}

export function createDb(connectionString: string, options: CreateDbOptions = {}) {
  const client = postgres(connectionString, {
    max: options.maxConnections ?? 10,
    // Transaction-mode poolers (Neon, Supabase, PgBouncer) do not support prepared statements.
    prepare: false,
  });

  return drizzle(client, { schema, casing: "snake_case" });
}

export type Database = ReturnType<typeof createDb>;
