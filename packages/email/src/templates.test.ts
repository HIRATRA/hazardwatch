import { describe, expect, it } from "vitest";

import { escapeHtml } from "./layout.js";
import { alertDigest, type AlertSummary } from "./templates/alert-digest.js";
import { verifyEmail } from "./templates/verify-email.js";

describe("escapeHtml", () => {
  it("escapes markup and quotes", () => {
    expect(escapeHtml(`<b class="x">Tom & Jerry's</b>`)).toBe(
      "&lt;b class=&quot;x&quot;&gt;Tom &amp; Jerry&#39;s&lt;/b&gt;",
    );
  });
});

describe("verifyEmail", () => {
  const message = verifyEmail({
    name: "Ada <script>",
    url: "http://localhost:3000/api/auth/verify-email?token=abc&callbackURL=%2Falerts",
  });

  it("links to the verification URL in both versions", () => {
    expect(message.subject).toBe("Confirm your email address");
    expect(message.text).toContain(
      "http://localhost:3000/api/auth/verify-email?token=abc&callbackURL=%2Falerts",
    );
    expect(message.html).toContain(
      'href="http://localhost:3000/api/auth/verify-email?token=abc&amp;callbackURL=%2Falerts"',
    );
  });

  it("escapes the user's name in HTML", () => {
    expect(message.html).toContain("Hi Ada &lt;script&gt;,");
    expect(message.html).not.toContain("<script>");
  });
});

describe("alertDigest", () => {
  const lisbon: AlertSummary = {
    eventTitle: "M 6.1 - 20 km S of Lisbon, Portugal",
    severity: "severe",
    zoneName: "Lisbon office",
    url: "http://localhost:3000/zones/z1?event=e1",
  };
  const links = {
    name: "Ada",
    alertsUrl: "http://localhost:3000/alerts",
    zonesUrl: "http://localhost:3000/zones",
  };

  it("names the event in the subject of a single alert", () => {
    expect(alertDigest({ ...links, alerts: [lisbon] }).subject).toBe(
      "Severe alert in Lisbon office: M 6.1 - 20 km S of Lisbon, Portugal",
    );
  });

  it("counts the alerts in the subject of a digest", () => {
    const message = alertDigest({
      ...links,
      alerts: [lisbon, { ...lisbon, severity: "minor", zoneName: "Home" }],
    });

    expect(message.subject).toBe("2 new alerts in your watch zones");
    expect(message.text).toContain("- Severe: M 6.1 - 20 km S of Lisbon, Portugal");
    expect(message.text).toContain("- Minor: M 6.1 - 20 km S of Lisbon, Portugal\n  In Home.");
  });

  it("links to each event, to every alert and to the zone settings", () => {
    const { text, html } = alertDigest({ ...links, alerts: [lisbon] });

    for (const url of [lisbon.url, links.alertsUrl, links.zonesUrl]) {
      expect(text).toContain(url);
      expect(html).toContain(`href="${url}"`);
    }
  });

  it("escapes names and titles in HTML", () => {
    const { html } = alertDigest({
      ...links,
      alerts: [{ ...lisbon, zoneName: "<img src=x>", eventTitle: "Flood & landslide" }],
    });

    expect(html).toContain("In &lt;img src=x&gt;");
    expect(html).toContain("Flood &amp; landslide");
    expect(html).not.toContain("<img");
  });
});
