import type { Logger } from "../logger.js";
import { groupByUser } from "./group.js";
import { alertPushMessage } from "./push-message.js";
import type { AlertPush, AlertPushRepository, PushTarget } from "./push-repository.js";
import { PushTargetGoneError, type PushSender } from "./push-sender.js";

/**
 * How often waiting alerts are pushed. Shorter than for email, since a
 * notification is meant to arrive while it matters, and the alerts a user
 * gets in between still share one notification.
 */
export const ALERT_PUSH_INTERVAL_MS = 60 * 1000;

export interface AlertPushNotifierDeps {
  repository: AlertPushRepository;
  sender: PushSender;
  logger: Logger;
}

export interface PushResult {
  notificationsSent: number;
  /** Browsers forgotten because their push service said they were gone. */
  targetsRemoved: number;
  /** Alerts put back in the queue because no browser could be reached. */
  alertsReleased: number;
}

/**
 * Pushes each user one notification about the alerts raised for their zones
 * since the last pass, to every browser they subscribed. When none of a
 * user's browsers can be reached for now, their alerts go back in the queue
 * for the next pass. Never rejects, so that a push service outage cannot
 * stop the worker.
 */
export async function pushPendingAlerts({
  repository,
  sender,
  logger,
}: AlertPushNotifierDeps): Promise<PushResult> {
  const result: PushResult = { notificationsSent: 0, targetsRemoved: 0, alertsReleased: 0 };

  let alerts: AlertPush[];
  let targets: PushTarget[];
  try {
    alerts = await repository.claimPending();
    targets = await repository.listTargets([...new Set(alerts.map((alert) => alert.userId))]);
  } catch (error) {
    logger.error({ err: error }, "could not read the alerts to push");
    return result;
  }

  const gone: string[] = [];
  const toRelease: string[] = [];

  for (const userAlerts of groupByUser(alerts)) {
    const [first] = userAlerts;
    if (!first) {
      continue;
    }
    const payload = JSON.stringify(
      alertPushMessage(
        userAlerts.map((alert) => ({
          eventTitle: alert.eventTitle,
          severity: alert.severity,
          zoneName: alert.zoneName,
          path: `/zones/${alert.zoneId}?event=${alert.eventId}`,
        })),
      ),
    );

    let delivered = false;
    let failedForNow = false;
    for (const target of targets.filter((candidate) => candidate.userId === first.userId)) {
      try {
        await sender.send(target, payload);
        delivered = true;
        result.notificationsSent += 1;
      } catch (error) {
        if (error instanceof PushTargetGoneError) {
          gone.push(target.id);
        } else {
          failedForNow = true;
          logger.warn({ err: error, userId: first.userId }, "could not push alerts to a browser");
        }
      }
    }

    // Browsers that are gone for good are no reason to try again.
    if (!delivered && failedForNow) {
      toRelease.push(...userAlerts.map((alert) => alert.alertId));
    }
  }

  try {
    await repository.removeTargets(gone);
    result.targetsRemoved = gone.length;
  } catch (error) {
    logger.error({ err: error }, "could not forget the browsers that are gone");
  }
  try {
    await repository.release(toRelease);
    result.alertsReleased = toRelease.length;
  } catch (error) {
    logger.error({ err: error }, "could not put alerts back in the push queue");
  }

  if (alerts.length > 0) {
    logger.info({ alerts: alerts.length, ...result }, "alert notifications pushed");
  }
  return result;
}
