import { alertDigest, type Mailer } from "@hazardwatch/email";

import type { Logger } from "../logger.js";
import type { AlertEmail, AlertEmailRepository } from "./email-repository.js";

/**
 * How often waiting alerts are emailed. The alerts a user gets in between
 * share one email.
 */
export const ALERT_EMAIL_INTERVAL_MS = 2 * 60 * 1000;

export interface AlertNotifierDeps {
  repository: AlertEmailRepository;
  mailer: Mailer;
  /** Public URL of the web application, for the links in emails. */
  appUrl: string;
  logger: Logger;
}

export interface NotifyResult {
  emailsSent: number;
  /** Alerts put back in the queue because their email failed. */
  alertsReleased: number;
}

/**
 * Emails each user the alerts raised for their zones since the last pass,
 * in one message per user. When a message fails, its alerts go back in the
 * queue for the next pass. Never rejects, so that a broken email server
 * cannot stop the worker.
 */
export async function emailPendingAlerts({
  repository,
  mailer,
  appUrl,
  logger,
}: AlertNotifierDeps): Promise<NotifyResult> {
  const result: NotifyResult = { emailsSent: 0, alertsReleased: 0 };

  let alerts: AlertEmail[];
  try {
    alerts = await repository.claimPending();
  } catch (error) {
    logger.error({ err: error }, "could not read the alerts to email");
    return result;
  }

  const link = (path: string) => new URL(path, appUrl).toString();

  for (const userAlerts of groupByUser(alerts)) {
    const [first] = userAlerts;
    if (!first) {
      continue;
    }
    try {
      await mailer.send({
        to: first.userEmail,
        ...alertDigest({
          name: first.userName,
          alerts: userAlerts.map((alert) => ({
            eventTitle: alert.eventTitle,
            severity: alert.severity,
            zoneName: alert.zoneName,
            url: link(`/zones/${alert.zoneId}?event=${alert.eventId}`),
          })),
          alertsUrl: link("/alerts"),
          zonesUrl: link("/zones"),
        }),
      });
      result.emailsSent += 1;
    } catch (error) {
      logger.warn(
        { err: error, userId: first.userId, alerts: userAlerts.length },
        "could not email alerts, retrying on the next pass",
      );
      try {
        await repository.release(userAlerts.map((alert) => alert.alertId));
        result.alertsReleased += userAlerts.length;
      } catch (releaseError) {
        logger.error({ err: releaseError }, "could not put alerts back in the email queue");
      }
    }
  }

  if (alerts.length > 0) {
    logger.info({ alerts: alerts.length, ...result }, "alert emails sent");
  }
  return result;
}

/** Splits alerts by user, keeping their order. */
function groupByUser(alerts: readonly AlertEmail[]): AlertEmail[][] {
  const groups = new Map<string, AlertEmail[]>();
  for (const alert of alerts) {
    const group = groups.get(alert.userId);
    if (group) {
      group.push(alert);
    } else {
      groups.set(alert.userId, [alert]);
    }
  }
  return [...groups.values()];
}
