import { describe, expect, it } from "vitest";

import { alertPushMessage, type PushAlert } from "./push-message.js";

const lisbon: PushAlert = {
  eventTitle: "M 6.1 - 20 km S of Lisbon, Portugal",
  severity: "severe",
  zoneName: "Lisbon office",
  path: "/zones/z1?event=e1",
};

describe("alertPushMessage", () => {
  it("names the zone and the event of a single alert, and opens it", () => {
    expect(alertPushMessage([lisbon])).toEqual({
      title: "Severe alert in Lisbon office",
      body: "M 6.1 - 20 km S of Lisbon, Portugal",
      path: "/zones/z1?event=e1",
    });
  });

  it("counts several alerts, lists the first three and opens the list", () => {
    const alerts = Array.from({ length: 5 }, (_, index) => ({
      ...lisbon,
      eventTitle: `Event ${index + 1}`,
    }));

    expect(alertPushMessage(alerts)).toEqual({
      title: "5 new alerts in your watch zones",
      body: "Event 1\nEvent 2\nEvent 3\nAnd 2 more.",
      path: "/alerts",
    });
  });

  it("lists every event when there are three or fewer", () => {
    const message = alertPushMessage([lisbon, { ...lisbon, eventTitle: "Flood" }]);

    expect(message.body).toBe("M 6.1 - 20 km S of Lisbon, Portugal\nFlood");
  });
});
