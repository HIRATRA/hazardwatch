import { createDb } from "@hazardwatch/db";
import { createMailer } from "@hazardwatch/email";

import { createAlertEmailRepository } from "./alerts/email-repository.js";
import { ALERT_EMAIL_INTERVAL_MS, emailPendingAlerts } from "./alerts/notifier.js";
import { loadConfig } from "./config.js";
import { startHealthServer } from "./health.js";
import { createLogger } from "./logger.js";
import { createIngestionRepository } from "./repository.js";
import { repeatEvery, runScheduler } from "./scheduler.js";
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

/** Emails waiting alerts on a fixed interval, when an SMTP server is configured. */
async function runAlertEmails(): Promise<void> {
  if (!config.SMTP_URL || !config.APP_URL) {
    logger.warn("SMTP_URL is not set, alerts are not emailed");
    return;
  }
  const deps = {
    repository: createAlertEmailRepository(db),
    mailer: createMailer({ smtpUrl: config.SMTP_URL, from: config.EMAIL_FROM }),
    appUrl: config.APP_URL,
    logger: logger.child({ task: "alert-emails" }),
  };
  await repeatEvery(
    ALERT_EMAIL_INTERVAL_MS,
    async () => {
      await emailPendingAlerts(deps);
    },
    controller.signal,
  );
}

const health = config.PORT === undefined ? null : await startHealthServer(config.PORT);
if (health) {
  logger.info({ port: health.port }, "health endpoint listening");
}

logger.info({ sources: sources.map((source) => source.id) }, "worker started");
await Promise.all([
  runScheduler(sources, { repository, logger }, controller.signal),
  runAlertEmails(),
]);
await health?.close();
await db.$client.end({ timeout: 5 });
logger.info("worker stopped");
