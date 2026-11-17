import { createDb, sql, type Database } from "@hazardwatch/db";
import { afterAll, beforeEach, inject } from "vitest";

/**
 * Connects to the database created for the integration tests and empties it
 * before every test, so that each one starts from a known state.
 */
export function useTestDatabase(): Database {
  const db = createDb(inject("databaseUrl"), { maxConnections: 2 });

  beforeEach(async () => {
    // Every table is listed, so that PostgreSQL has no cascade to report.
    await db.execute(sql`truncate table
      zone_alerts, watch_zones, hazard_events, ingestion_runs,
      verification, session, account, "user"
      cascade`);
  });

  afterAll(async () => {
    await db.$client.end();
  });

  return db;
}
