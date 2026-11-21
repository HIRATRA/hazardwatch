import type { SourceRun } from "./queries";

/**
 * State of a data feed: updating as expected, behind schedule, failing, or
 * turned off.
 */
export type FeedStatus = "ok" | "late" | "failed" | "off";

/** Shortest delay after which a feed counts as late, whatever its interval. */
const MIN_LATE_AFTER_MINUTES = 15;

/**
 * The state of a feed from its last finished run. A feed is late once three
 * of its intervals have passed without a run, which rides out a slow or
 * skipped run but not a stopped worker.
 */
export function feedStatus(
  run: Pick<SourceRun, "status" | "startedAt"> | undefined,
  intervalMinutes: number,
  now: Date,
): FeedStatus {
  if (!run) {
    return "off";
  }
  if (run.status === "failed") {
    return "failed";
  }
  const lateAfterMs = Math.max(3 * intervalMinutes, MIN_LATE_AFTER_MINUTES) * 60_000;
  return now.getTime() - new Date(run.startedAt).getTime() > lateAfterMs ? "late" : "ok";
}
