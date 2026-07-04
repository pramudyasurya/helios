import type {
  Run,
  Evidence,
  EvidenceStatus,
  EvidenceType,
} from "@/generated/prisma/client";
import type {
  CheckResult,
  LatestRun,
  TrailStep,
} from "@/lib/helios/shared/types";
import { transformRawEvidence } from "@/lib/helios/shared/evidence-transformer";
import { validateAIReport } from "@/lib/helios/shared/validators";

function jsonStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export function runRecordToLatestRun(
  run: Run & { evidence?: Evidence[] },
): LatestRun {
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
    report: run.report
      ? (validateAIReport(run.report) ?? undefined)
      : undefined,
    evidence:
      run.evidence && run.evidence.length > 0
        ? run.evidence.map((e) => ({
            id: e.id,
            type: e.type as EvidenceType,
            content: e.content,
            pageUrl: e.pageUrl,
            resourceUrl: e.resourceUrl ?? undefined,
            status: e.status as EvidenceStatus,
            capturedAt: e.createdAt.toISOString(),
          }))
        : transformRawEvidence({
            runId: run.id,
            capturedAt:
              run.finishedAt?.toISOString() ?? run.createdAt.toISOString(),
            pageUrl: run.finalUrl ?? run.startingUrl,
            brokenImages: jsonStringArray(run.brokenImages),
            consoleErrors: jsonStringArray(run.consoleErrors),
            failedRequests: jsonStringArray(run.failedRequests),
          }),
  };
}
