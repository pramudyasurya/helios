import type { Prisma } from "@/generated/prisma/client";
import type {
  QARunJob,
  QARunJobMeta,
} from "@/lib/server/infrastructure/queue/qa-jobs";
import { prisma } from "@/lib/server/infrastructure/db/prisma";
import { getErrorMessage } from "@/lib/shared/domain/errors";
import { runMultiRouteQA } from "@/lib/server/infrastructure/runner/runner";
import {
  appendRunTrailStep,
  boundTrailSteps,
  redactEmbeddedUrls,
  sanitizeTrailSteps,
} from "@/lib/server/infrastructure/runner/trail";

export async function processQARun(
  job: QARunJob,
  meta: QARunJobMeta,
): Promise<void> {
  const startedAt = new Date();
  const isFinalAttempt = meta.retryCount >= meta.retryLimit;

  try {
    await appendRunTrailStep({
      runId: job.runId,
      step: {
        label:
          meta.retryCount > 0
            ? `Worker retrying (Attempt ${meta.retryCount + 1})`
            : "Worker started",
        detail:
          meta.retryCount > 0
            ? `Helios QA worker initiated retry attempt ${meta.retryCount + 1} of ${meta.retryLimit + 1}.`
            : "Helios QA worker initiated execution.",
        timestamp: startedAt.toISOString(),
      },
    });

    await prisma.run.update({
      where: { id: job.runId },
      data: { status: "Running", summary: "Helios is running browser QA." },
    });
    await prisma.pageResult.deleteMany({ where: { runId: job.runId } });

    const result = await runMultiRouteQA({
      submittedUrl: job.submittedUrl,
      runId: job.runId,
      mode: job.mode,
      routes: job.routes,
      maxPages: job.maxPages,
      maxDepth: job.maxDepth,
    });
    const primaryResult = result.pageResults[0];
    const existingRun = await prisma.run.findUnique({
      where: { id: job.runId },
      select: { trail: true },
    });
    const rawTrail = Array.isArray(existingRun?.trail)
      ? (existingRun.trail as unknown[])
      : [];
    const trail = mergeTrailSteps(sanitizeTrailSteps(rawTrail), result.trail);

    await prisma.run.update({
      where: { id: job.runId },
      data: {
        status: result.status,
        summary: result.summary,
        finishedAt: new Date(result.finishedAt),
        durationMs: result.durationMs,
        finalUrl: primaryResult?.finalUrl,
        title: primaryResult?.title,
        description: primaryResult?.description,
        artifacts: primaryResult?.artifacts,
        brokenImages: primaryResult?.brokenImages,
        consoleErrors: primaryResult?.consoleErrors,
        failedRequests: primaryResult?.failedRequests,
        loadMetrics: primaryResult?.loadMetrics,
        trail: trail as unknown as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    const failedAt = new Date();
    const detail = redactEmbeddedUrls(
      getErrorMessage(error, "Unknown browser QA error."),
    );
    const label = isFinalAttempt
      ? "Run failed"
      : `Attempt ${meta.retryCount + 1} failed`;
    const trail = await appendRunTrailStep({
      runId: job.runId,
      step: { label, detail, timestamp: failedAt.toISOString() },
    });

    if (isFinalAttempt) {
      await prisma.run.update({
        where: { id: job.runId },
        data: {
          status: "Failed",
          summary: "Helios could not complete the browser QA run.",
          finishedAt: failedAt,
          durationMs: failedAt.getTime() - startedAt.getTime(),
          trail: trail as unknown as Prisma.InputJsonValue,
          checks: [
            {
              title: "Browser run failed",
              detail,
              status: "failed",
              severity: "high",
            },
          ],
        },
      });
    }

    throw error;
  }
}

function mergeTrailSteps(
  persistedTrail: ReturnType<typeof sanitizeTrailSteps>,
  resultTrail: ReturnType<typeof sanitizeTrailSteps>,
) {
  const mergedTrail = [...persistedTrail];

  for (const step of resultTrail) {
    const alreadyPersisted = mergedTrail.some(
      (persisted) =>
        persisted.label === step.label && persisted.timestamp === step.timestamp,
    );
    if (!alreadyPersisted) mergedTrail.push(step);
  }

  return boundTrailSteps(mergedTrail);
}
