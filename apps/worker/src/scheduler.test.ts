import { describe, expect, it, vi } from "vitest";

import { repeatEvery } from "./scheduler.js";

describe("repeatEvery", () => {
  it("runs the task again after each interval until aborted", async () => {
    const controller = new AbortController();
    let runs = 0;
    const task = vi.fn(() => {
      runs += 1;
      if (runs === 3) {
        controller.abort();
      }
      return Promise.resolve();
    });

    await repeatEvery(1, task, controller.signal);

    expect(task).toHaveBeenCalledTimes(3);
  });

  it("stops while waiting for the next run", async () => {
    const controller = new AbortController();
    const task = vi.fn(() => Promise.resolve());

    const done = repeatEvery(60_000, task, controller.signal);
    controller.abort();
    await done;

    expect(task).toHaveBeenCalledTimes(1);
  });

  it("never overlaps runs", async () => {
    const controller = new AbortController();
    let running = 0;
    let maxRunning = 0;
    let runs = 0;
    const task = async () => {
      running += 1;
      maxRunning = Math.max(maxRunning, running);
      await new Promise((resolve) => setTimeout(resolve, 5));
      running -= 1;
      runs += 1;
      if (runs === 3) {
        controller.abort();
      }
    };

    await repeatEvery(0, task, controller.signal);

    expect(maxRunning).toBe(1);
  });
});
