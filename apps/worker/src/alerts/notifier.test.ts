import type { EmailMessage, Mailer } from "@hazardwatch/email";
import { pino } from "pino";
import { describe, expect, it, vi } from "vitest";

import type { AlertEmail, AlertEmailRepository } from "./email-repository.js";
import { emailPendingAlerts } from "./notifier.js";

const logger = pino({ level: "silent" });
const appUrl = "https://hazardwatch.example.com";

function alert(overrides: Partial<AlertEmail> = {}): AlertEmail {
  return {
    alertId: "alert-1",
    userId: "user-1",
    userName: "Ada",
    userEmail: "ada@example.test",
    zoneId: "zone-1",
    zoneName: "Lisbon office",
    eventId: "event-1",
    eventTitle: "M 6.1 - 20 km S of Lisbon, Portugal",
    severity: "severe",
    ...overrides,
  };
}

function setup(pending: AlertEmail[], failFor: string[] = []) {
  const sent: EmailMessage[] = [];
  const mailer: Mailer = {
    send: vi.fn((message: EmailMessage) => {
      if (failFor.includes(message.to)) {
        return Promise.reject(new Error("550 mailbox unavailable"));
      }
      sent.push(message);
      return Promise.resolve();
    }),
  };
  const claimPending = vi.fn(() => Promise.resolve(pending));
  const release = vi.fn((_alertIds: readonly string[]) => Promise.resolve());
  const repository: AlertEmailRepository = { claimPending, release };
  return { deps: { repository, mailer, appUrl, logger }, sent, claimPending, release };
}

describe("emailPendingAlerts", () => {
  it("sends each user one email with all their alerts", async () => {
    const { deps, sent } = setup([
      alert({ alertId: "a1" }),
      alert({ alertId: "a2", userId: "user-2", userEmail: "bob@example.test", userName: "Bob" }),
      alert({ alertId: "a3", eventTitle: "Flood in Tagus valley", severity: "moderate" }),
    ]);

    const result = await emailPendingAlerts(deps);

    expect(result).toEqual({ emailsSent: 2, alertsReleased: 0 });
    expect(sent.map((message) => [message.to, message.subject])).toEqual([
      ["ada@example.test", "2 new alerts in your watch zones"],
      ["bob@example.test", "Severe alert in Lisbon office: M 6.1 - 20 km S of Lisbon, Portugal"],
    ]);
    expect(sent[0]?.text).toContain("Flood in Tagus valley");
  });

  it("links to the event on its zone's map, to the alerts and to the zones", async () => {
    const { deps, sent } = setup([alert()]);

    await emailPendingAlerts(deps);

    expect(sent[0]?.text).toContain("https://hazardwatch.example.com/zones/zone-1?event=event-1");
    expect(sent[0]?.text).toContain("https://hazardwatch.example.com/alerts");
    expect(sent[0]?.text).toContain("https://hazardwatch.example.com/zones");
  });

  it("puts the alerts of a failed email back in the queue", async () => {
    const { deps, sent, release } = setup(
      [
        alert({ alertId: "a1" }),
        alert({ alertId: "a2", userId: "user-2", userEmail: "bob@example.test" }),
        alert({ alertId: "a3", userId: "user-2", userEmail: "bob@example.test" }),
      ],
      ["bob@example.test"],
    );

    const result = await emailPendingAlerts(deps);

    expect(result).toEqual({ emailsSent: 1, alertsReleased: 2 });
    expect(sent.map((message) => message.to)).toEqual(["ada@example.test"]);
    expect(release).toHaveBeenCalledWith(["a2", "a3"]);
  });

  it("does nothing when no alert is waiting", async () => {
    const { deps, sent } = setup([]);

    expect(await emailPendingAlerts(deps)).toEqual({ emailsSent: 0, alertsReleased: 0 });
    expect(sent).toEqual([]);
  });

  it("survives a database failure", async () => {
    const { deps, claimPending } = setup([]);
    claimPending.mockRejectedValueOnce(new Error("connection reset"));

    await expect(emailPendingAlerts(deps)).resolves.toEqual({ emailsSent: 0, alertsReleased: 0 });
  });
});
