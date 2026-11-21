import type { HazardSeverity } from "@hazardwatch/db";

const severityLabels: Record<HazardSeverity, string> = {
  minor: "Minor",
  moderate: "Moderate",
  severe: "Severe",
  extreme: "Extreme",
};

/** Events named in one notification. The others are counted. */
const MAX_LISTED_EVENTS = 3;

export interface PushAlert {
  eventTitle: string;
  severity: HazardSeverity;
  zoneName: string;
  /** Path of the event on its zone's map. */
  path: string;
}

/** What the service worker shows, sent to the browser as JSON. */
export interface PushMessage {
  title: string;
  body: string;
  /** Path the notification opens, within the web application. */
  path: string;
}

/**
 * Tells a user about the alerts raised for their zones since the last pass,
 * in one notification. A single alert opens its event, several open the
 * list of alerts.
 */
export function alertPushMessage(alerts: readonly PushAlert[]): PushMessage {
  const [first] = alerts;
  if (alerts.length === 1 && first) {
    return {
      title: `${severityLabels[first.severity]} alert in ${first.zoneName}`,
      body: first.eventTitle,
      path: first.path,
    };
  }

  const listed = alerts.slice(0, MAX_LISTED_EVENTS).map((alert) => alert.eventTitle);
  const unlisted = alerts.length - listed.length;
  if (unlisted > 0) {
    listed.push(unlisted === 1 ? "And 1 more." : `And ${unlisted} more.`);
  }
  return {
    title: `${alerts.length} new alerts in your watch zones`,
    body: listed.join("\n"),
    path: "/alerts",
  };
}
