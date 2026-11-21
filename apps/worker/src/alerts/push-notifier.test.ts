import { pino } from "pino";
import { describe, expect, it, vi } from "vitest";

import { pushPendingAlerts } from "./push-notifier.js";
import type { AlertPush, AlertPushRepository, PushTarget } from "./push-repository.js";
import { PushTargetGoneError, type PushSender } from "./push-sender.js";

const logger = pino({ level: "silent" });

function alert(overrides: Partial<AlertPush> = {}): AlertPush {
  return {
    alertId: "alert-1",
    userId: "user-1",
    zoneId: "zone-1",
    zoneName: "Lisbon office",
    eventId: "event-1",
    eventTitle: "M 6.1 - 20 km S of Lisbon, Portugal",
    severity: "severe",
    ...overrides,
  };
}

function target(id: string, userId = "user-1"): PushTarget {
  return { id, userId, endpoint: `https://push.example.test/${id}`, p256dh: "key", auth: "secret" };
}

interface Setup {
  pending: AlertPush[];
  targets: PushTarget[];
  /** Target ids whose push service answers that they are gone. */
  gone?: string[];
  /** Target ids whose push service fails for now. */
  failing?: string[];
}

function setup({ pending, targets, gone = [], failing = [] }: Setup) {
  const sent: { targetId: string; payload: unknown }[] = [];
  const send = vi.fn((pushTarget: PushTarget, payload: string) => {
    if (gone.includes(pushTarget.id)) {
      return Promise.reject(new PushTargetGoneError());
    }
    if (failing.includes(pushTarget.id)) {
      return Promise.reject(new Error("503 service unavailable"));
    }
    sent.push({ targetId: pushTarget.id, payload: JSON.parse(payload) });
    return Promise.resolve();
  });
  const sender: PushSender = { send };
  const repository = {
    claimPending: vi.fn(() => Promise.resolve(pending)),
    release: vi.fn((_alertIds: readonly string[]) => Promise.resolve()),
    listTargets: vi.fn((userIds: readonly string[]) =>
      Promise.resolve(targets.filter((candidate) => userIds.includes(candidate.userId))),
    ),
    removeTargets: vi.fn((_targetIds: readonly string[]) => Promise.resolve()),
  } satisfies AlertPushRepository;
  return { deps: { repository, sender, logger }, sent, send, repository };
}

describe("pushPendingAlerts", () => {
  it("pushes each user one notification to every one of their browsers", async () => {
    const { deps, sent } = setup({
      pending: [
        alert({ alertId: "a1" }),
        alert({ alertId: "a2", userId: "user-2" }),
        alert({ alertId: "a3", eventTitle: "Flood in Tagus valley" }),
      ],
      targets: [target("phone"), target("laptop"), target("tablet", "user-2")],
    });

    const result = await pushPendingAlerts(deps);

    expect(result).toEqual({ notificationsSent: 3, targetsRemoved: 0, alertsReleased: 0 });
    expect(sent.map((push) => push.targetId)).toEqual(["phone", "laptop", "tablet"]);
    expect(sent[0]?.payload).toMatchObject({
      title: "2 new alerts in your watch zones",
      path: "/alerts",
    });
    expect(sent[2]?.payload).toEqual({
      title: "Severe alert in Lisbon office",
      body: "M 6.1 - 20 km S of Lisbon, Portugal",
      path: "/zones/zone-1?event=event-1",
    });
  });

  it("forgets browsers that are gone without retrying their alerts", async () => {
    const { deps, repository } = setup({
      pending: [alert()],
      targets: [target("old-phone")],
      gone: ["old-phone"],
    });

    const result = await pushPendingAlerts(deps);

    expect(result).toEqual({ notificationsSent: 0, targetsRemoved: 1, alertsReleased: 0 });
    expect(repository.removeTargets).toHaveBeenCalledWith(["old-phone"]);
    expect(repository.release).toHaveBeenCalledWith([]);
  });

  it("puts alerts back in the queue when no browser could be reached for now", async () => {
    const { deps, repository } = setup({
      pending: [alert({ alertId: "a1" }), alert({ alertId: "a2", userId: "user-2" })],
      targets: [target("phone"), target("laptop", "user-2")],
      failing: ["phone"],
    });

    const result = await pushPendingAlerts(deps);

    expect(result).toEqual({ notificationsSent: 1, targetsRemoved: 0, alertsReleased: 1 });
    expect(repository.release).toHaveBeenCalledWith(["a1"]);
  });

  it("keeps alerts sent once one of the user's browsers got them", async () => {
    const { deps, repository } = setup({
      pending: [alert()],
      targets: [target("phone"), target("laptop")],
      failing: ["laptop"],
    });

    const result = await pushPendingAlerts(deps);

    expect(result.alertsReleased).toBe(0);
    expect(repository.release).toHaveBeenCalledWith([]);
  });

  it("does nothing when no alert is waiting", async () => {
    const { deps, send } = setup({ pending: [], targets: [target("phone")] });

    expect(await pushPendingAlerts(deps)).toEqual({
      notificationsSent: 0,
      targetsRemoved: 0,
      alertsReleased: 0,
    });
    expect(send).not.toHaveBeenCalled();
  });

  it("never rejects when the database fails", async () => {
    const { deps, repository } = setup({ pending: [], targets: [] });
    repository.claimPending.mockRejectedValueOnce(new Error("connection lost"));

    await expect(pushPendingAlerts(deps)).resolves.toEqual({
      notificationsSent: 0,
      targetsRemoved: 0,
      alertsReleased: 0,
    });
  });
});
