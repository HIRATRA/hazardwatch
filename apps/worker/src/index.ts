import { createDb } from "@hazardwatch/db";
import { createMailer } from "@hazardwatch/email";

import { createAlertEmailRepository } from "./alerts/email-repository.js";
import { ALERT_EMAIL_INTERVAL_MS, emailPendingAlerts } from "./alerts/notifier.js";
import { ALERT_PUSH_INTERVAL_MS, pushPendingAlerts } from "./alerts/push-notifier.js";
import { createAlertPushRepository } from "./alerts/push-repository.js";
import { createPushSender } from "./alerts/push-sender.js";
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

/** Pushes waiting alerts on a fixed interval, when VAPID keys are configured. */
async function runAlertPushes(): Promise<void> {
  const subject = config.VAPID_SUBJECT ?? config.APP_URL;
  if (!config.VAPID_PUBLIC_KEY || !config.VAPID_PRIVATE_KEY || !subject) {
    logger.warn("VAPID keys are not set, alerts are not pushed");
    return;
  }
  const deps = {
    repository: createAlertPushRepository(db),
    sender: createPushSender({
      publicKey: config.VAPID_PUBLIC_KEY,
      privateKey: config.VAPID_PRIVATE_KEY,
      subject,
    }),
    logger: logger.child({ task: "alert-pushes" }),
  };
  await repeatEvery(
    ALERT_PUSH_INTERVAL_MS,
    async () => {
      await pushPendingAlerts(deps);
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
  runAlertPushes(),
]);
await health?.close();
await db.$client.end({ timeout: 5 });
logger.info("worker stopped");
