import type { HazardSeverity } from "@hazardwatch/db/constants";

import { escapeHtml, renderButton, renderLayout } from "../layout.js";

const severityLabels: Record<HazardSeverity, string> = {
  minor: "Minor",
  moderate: "Moderate",
  severe: "Severe",
  extreme: "Extreme",
};

/** Darker than the map markers, to stay readable on a white background. */
const severityColors: Record<HazardSeverity, string> = {
  minor: "#a16207",
  moderate: "#c2410c",
  severe: "#dc2626",
  extreme: "#a21caf",
};

/** Alerts listed in one email. The others are counted, and listed in the app. */
const MAX_LISTED_ALERTS = 10;

export interface AlertSummary {
  eventTitle: string;
  /** Severity of the event when the alert was raised. */
  severity: HazardSeverity;
  zoneName: string;
  /** Link to the event on its zone's map. */
  url: string;
}

export interface AlertDigestContent {
  name: string;
  /** New alerts, most recent first. Never empty. */
  alerts: readonly AlertSummary[];
  /** Link to the list of every alert. */
  alertsUrl: string;
  /** Link to the zones, where email alerts can be turned off. */
  zonesUrl: string;
}

/** Tells a user about the alerts raised for their zones since the last email. */
export function alertDigest({ name, alerts, alertsUrl, zonesUrl }: AlertDigestContent) {
  const [first] = alerts;
  const subject =
    alerts.length === 1 && first
      ? `${severityLabels[first.severity]} alert in ${first.zoneName}: ${first.eventTitle}`
      : `${alerts.length} new alerts in your watch zones`;
  const intro =
    alerts.length === 1
      ? "An event reached one of your watch zones."
      : `${alerts.length} events reached your watch zones.`;
  const footer = "You receive these emails because email alerts are on for these zones.";
  const listed = alerts.slice(0, MAX_LISTED_ALERTS);
  const unlisted = alerts.length - listed.length;
  const more = unlisted === 1 ? "And 1 more alert." : `And ${unlisted} more alerts.`;

  const text = `Hi ${name},

${intro}

${listed
  .map(
    (alert) =>
      `- ${severityLabels[alert.severity]}: ${alert.eventTitle}
  In ${alert.zoneName}. ${alert.url}`,
  )
  .join("\n")}
${unlisted > 0 ? `\n${more}\n` : ""}
See all your alerts: ${alertsUrl}

${footer} Turn them off for any zone: ${zonesUrl}
`;

  const items = listed
    .map(
      (alert) => `<li style="margin:0 0 16px;line-height:1.4;">
          <span style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:${severityColors[alert.severity]};">${severityLabels[alert.severity]}</span><br>
          <a href="${escapeHtml(alert.url)}" style="color:#111827;font-weight:600;">${escapeHtml(alert.eventTitle)}</a><br>
          <span style="font-size:13px;color:#6b7280;">In ${escapeHtml(alert.zoneName)}</span>
        </li>`,
    )
    .join("\n        ");

  const html = renderLayout({
    heading: intro,
    contentHtml: `<p style="margin:0 0 16px;line-height:1.5;">Hi ${escapeHtml(name)},</p>
      <ul style="margin:0;padding:0;list-style:none;">
        ${items}
      </ul>
      ${unlisted > 0 ? `<p style="margin:0;line-height:1.5;">${more}</p>` : ""}
      ${renderButton("See all your alerts", alertsUrl)}`,
    footerHtml: `${footer} <a href="${escapeHtml(zonesUrl)}" style="color:#6b7280;">Turn them off for any zone</a>.`,
  });

  return { subject, text, html };
}
