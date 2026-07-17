import type { LatestRun } from "@/lib/shared/domain/types";

export const RUNNING_STATE_DELAY_MS = 1000;

export type QueuedRunState = {
  run: LatestRun;
  startTime: number;
};

export function createQueuedRunState(url: string): QueuedRunState {
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

export function markRunRunning(run: LatestRun): LatestRun {
  const runningAt = new Date();

  return {
    ...run,
    status: "Running",
    trail: [
      ...run.trail,
      {
        label: "QA run running",
        detail: "Browser session is being launched.",
        timestamp: runningAt.toISOString(),
      },
    ],
    summary: "Helios is running a real browser QA check.",
  };
}
