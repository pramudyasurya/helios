import type { LatestRun } from "@/lib/helios/types";

export const FAKE_RUN_RUNNING_DELAY_MS = 1000;
export const FAKE_RUN_COMPLETED_DELAY_MS = 3000;

export type QueuedFakeRun = {
  run: LatestRun;
  startTime: number;
};

export function createQueuedFakeRun(url: string): QueuedFakeRun {
  const now = new Date();
  const runId = `run_${now.getTime()}`;

  return {
    run: {
      id: runId,
      startingUrl: url,
      status: "Queued",
      trail: [
        {
          label: "QA run queued",
          detail: "Waiting to launch a browser session.",
          timestamp: now.toISOString(),
        },
      ],
      checks: [],
      summary: "QA run queued and waiting to start.",
      createdAt: now.toISOString(),
    },
    startTime: now.getTime(),
  };
}

export function markFakeRunRunning(run: LatestRun): LatestRun {
  const runningAt = new Date();

  return {
    ...run,
    status: "Running",
    trail: [
      ...run.trail,
      {
        label: "QA agent is running",
        detail: "Browser session is being launched.",
        timestamp: runningAt.toISOString(),
      },
    ],
    summary: "Helios is running a fake browser QA check.",
  };
}

export function markFakeRunCompleted(
  run: LatestRun,
  startTime: number,
): LatestRun {
  const completedAt = new Date();
  const durationMs = completedAt.getTime() - startTime;

  return {
    ...run,
    status: "Completed",
    trail: [
      ...run.trail,
      {
        label: "Navigated to URL",
        detail: "Helios navigated the browser to the submitted URL.",
        timestamp: completedAt.toISOString(),
      },
      {
        label: "Page loaded",
        detail: "The page reached a loaded state.",
        timestamp: completedAt.toISOString(),
      },
      {
        label: "Desktop screenshot captured",
        detail: "Desktop viewport screenshot was captured.",
        timestamp: completedAt.toISOString(),
      },
      {
        label: "Mobile screenshot captured",
        detail: "Mobile viewport screenshot was captured.",
        timestamp: completedAt.toISOString(),
      },
      {
        label: "Console logs collected",
        detail: "Console logs were collected for review.",
        timestamp: completedAt.toISOString(),
      },
      {
        label: "Network failures checked",
        detail: "Failed network requests were checked.",
        timestamp: completedAt.toISOString(),
      },
      {
        label: "QA run completed",
        detail: "Browser session has been finished.",
        timestamp: completedAt.toISOString(),
      },
    ],
    summary:
      "Completed fake QA run with screenshots, logs, and network checks simulated.",
    checks: [
      {
        title: "Page loaded successfully",
        detail: "The page reached a loaded state during the fake QA run.",
        status: "passed",
        severity: "info",
      },
      {
        title: "Desktop screenshot captured",
        detail: "A desktop viewport screenshot was simulated for this run.",
        status: "passed",
        severity: "info",
      },
      {
        title: "Mobile screenshot captured",
        detail: "A mobile viewport screenshot was simulated for this run.",
        status: "passed",
        severity: "info",
      },
      {
        title: "Console logs collected",
        detail: "Console logs were collected and marked for review.",
        status: "warning",
        severity: "low",
      },
      {
        title: "Network failures checked",
        detail: "Failed network requests were checked during the QA pass.",
        status: "passed",
        severity: "info",
      },
    ],

    finishedAt: completedAt.toISOString(),
    durationMs,
  };
}
