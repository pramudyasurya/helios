import type { LatestRun } from "@/lib/shared/domain/types";

export function createFailedRunState(
  currentRun: LatestRun,
  message: string,
): LatestRun {
  const failedAt = new Date().toISOString();

  return {
    ...currentRun,
    status: "Failed",
    summary: "Helios could not complete the browser QA run.",
    finishedAt: failedAt,
    checks: [
      {
        title: "Browser run failed",
        detail: message,
        status: "failed",
        severity: "high",
      },
    ],
    trail: [
      ...currentRun.trail,
      {
        label: "Browser run failed",
        detail: `Helios stopped the QA run: ${message}`,
        timestamp: failedAt,
      },
    ],
  };
}
