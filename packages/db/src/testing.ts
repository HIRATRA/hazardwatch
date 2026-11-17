import postgres from "postgres";

import { applyMigrations } from "./migrations.js";

export interface TemporaryDatabase {
  /** Connection string of the new database. */
  url: string;
  /** Drops the database, closing any connection still open to it. */
  drop(): Promise<void>;
}

/**
 * Creates an empty database with every migration applied, on the server that
 * `serverUrl` points to, so that tests never touch the data they connect
 * through. The role in `serverUrl` needs the CREATEDB privilege.
 */
export async function createTemporaryDatabase(serverUrl: string): Promise<TemporaryDatabase> {
  const name = `hazardwatch_test_${Date.now()}_${process.pid}`;
  const admin = postgres(serverUrl, { max: 1, onnotice: () => {} });
  await admin.unsafe(`create database "${name}"`);

  const url = new URL(serverUrl);
  url.pathname = `/${name}`;
  try {
    await applyMigrations(url.toString());
  } catch (error) {
    await admin.unsafe(`drop database "${name}" with (force)`);
    await admin.end();
    throw error;
  }

  return {
    url: url.toString(),
    async drop() {
      try {
        await admin.unsafe(`drop database if exists "${name}" with (force)`);
      } finally {
        await admin.end();
      }
    },
  };
}
