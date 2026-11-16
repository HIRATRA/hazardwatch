import { createDb } from "@hazardwatch/db";

import { loadConfig } from "./config.js";
import { createLogger } from "./logger.js";
import { createIngestionRepository } from "./repository.js";
import { runScheduler } from "./scheduler.js";
import { sources } from "./sources/index.js";

const config = loadConfig();
const logger = createLogger(config);
const db = createDb(config.DATABASE_URL, { maxConnections: 5 });
const repository = createIngestionRepository(db);

const controller = new AbortController();

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    logger.info({ signal }, "shutting down");
    controller.abort();
  });
}

if (sources.length === 0) {
  logger.warn("no sources registered, nothing to ingest");
}

logger.info({ sources: sources.map((source) => source.id) }, "worker started");
await runScheduler(sources, { repository, logger }, controller.signal);
await db.$client.end({ timeout: 5 });
logger.info("worker stopped");
