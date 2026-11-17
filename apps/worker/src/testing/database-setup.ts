import { createTemporaryDatabase } from "@hazardwatch/db/testing";
import type { TestProject } from "vitest/node";

declare module "vitest" {
  export interface ProvidedContext {
    /** Connection string of the throwaway database the tests run against. */
    databaseUrl: string;
  }
}

/**
 * Creates a migrated database for the integration tests on the server that
 * DATABASE_URL points to, and drops it once they are done.
 */
export default async function setup(project: TestProject) {
  const serverUrl = process.env.DATABASE_URL;
  if (!serverUrl) {
    throw new Error("Integration tests need DATABASE_URL to point to a PostgreSQL server.");
  }

  const database = await createTemporaryDatabase(serverUrl);
  project.provide("databaseUrl", database.url);
  return () => database.drop();
}
