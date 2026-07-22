import "server-only";
import type {
  Run,
  Evidence,
  EvidenceStatus,
  EvidenceType,
  PageResult as PrismaPageResult,
} from "@/generated/prisma/client";
import type {
  CheckResult,
  LatestRun,
  TrailStep,
} from "@/lib/shared/domain/types";
import { transformRawEvidence } from "@/lib/shared/domain/evidence-transformer";
import { validateAIReport } from "@/lib/shared/domain/validators";

function jsonStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export function runRecordToLatestRun(
  run: Run & { evidence?: Evidence[]; pageResults?: PrismaPageResult[] },
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
    pageResults: run.pageResults?.map((pageResult) => ({
      id: pageResult.id,
      url: pageResult.url,
      depth: pageResult.depth,
      status: pageResult.status,
      statusCode: pageResult.statusCode ?? undefined,
      finalUrl: pageResult.finalUrl ?? undefined,
      title: pageResult.title ?? undefined,
      description: pageResult.description ?? undefined,
      durationMs: pageResult.durationMs ?? undefined,
      artifacts: pageResult.artifacts as LatestRun["artifacts"],
      brokenImages: pageResult.brokenImages as string[] | undefined,
      consoleErrors: pageResult.consoleErrors as string[] | undefined,
      failedRequests: pageResult.failedRequests as string[] | undefined,
      loadMetrics: pageResult.loadMetrics as LatestRun["loadMetrics"],
      createdAt: pageResult.createdAt.toISOString(),
      updatedAt: pageResult.updatedAt.toISOString(),
    })),
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
