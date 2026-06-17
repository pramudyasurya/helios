import type { Run } from "@/generated/prisma/client";
import type {
  CheckResult,
  LatestRun,
  TrailStep,
} from "@/lib/helios/shared/types";

export function runRecordToLatestRun(run: Run): LatestRun {
  return {
    id: run.id,
    startingUrl: run.startingUrl,
    status: run.status as LatestRun["status"],
    summary: run.summary,
    createdAt: run.createdAt.toISOString(),
    finishedAt: run.finishedAt?.toISOString(),
    durationMs: run.durationMs ?? undefined,
    finalUrl: run.finalUrl ?? undefined,
    title: run.title ?? undefined,
    description: run.description ?? undefined,
    trail: run.trail as TrailStep[],
    checks: run.checks as CheckResult[],
    artifacts: run.artifacts as LatestRun["artifacts"],
    brokenImages: run.brokenImages as LatestRun["brokenImages"],
    consoleErrors: run.consoleErrors as LatestRun["consoleErrors"],
    failedRequests: run.failedRequests as LatestRun["failedRequests"],
    loadMetrics: run.loadMetrics as LatestRun["loadMetrics"],
  };
}
