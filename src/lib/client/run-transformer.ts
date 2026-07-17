import { createChecksFromRunResult } from "@/lib/shared/domain/checks";
import type { CreateRunResponse, LatestRun } from "@/lib/shared/domain/types";

export function createCompletedRunState(
  currentRun: LatestRun,
  result: CreateRunResponse,
): LatestRun {
  const checks = createChecksFromRunResult(result);

  return {
    ...currentRun,
    id: result.id,
    finalUrl: result.finalUrl,
    title: result.title,
    description: result.description,
    summary: result.summary,
    checks,
    status: "Completed",
    createdAt: result.createdAt,
    finishedAt: result.finishedAt,
    durationMs: result.durationMs,
    loadMetrics: result.loadMetrics,
    trail: [
      ...result.trail,
      {
        label: "Dashboard updated",
        detail: "Helios displayed the completed browser QA result.",
        timestamp: result.finishedAt,
      },
    ],
    artifacts: result.artifacts,
    brokenImages: result.brokenImages,
    consoleErrors: result.consoleErrors,
    failedRequests: result.failedRequests,
  };
}

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
