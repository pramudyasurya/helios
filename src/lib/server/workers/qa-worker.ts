import { prisma } from "@/lib/server/infrastructure/db/prisma";
import type { Prisma } from "@/generated/prisma/client";
import {
  startQARunWorker,
  stopQABoss,
  type QARunJob,
} from "@/lib/server/infrastructure/queue/qa-jobs";
import { runMultiRouteQA } from "@/lib/server/infrastructure/runner/runner";
import { getErrorMessage } from "@/lib/shared/domain/errors";

async function processQARun(job: QARunJob): Promise<void> {
  const startedAt = new Date();

  await prisma.run.update({
    where: { id: job.runId },
    data: {
      status: "Running",
      summary: "Helios is running browser QA.",
    },
  });

  try {
    await prisma.pageResult.deleteMany({
      where: { runId: job.runId },
    });

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
    const existingTrail = Array.isArray(existingRun?.trail)
      ? (existingRun.trail as unknown[])
      : [];
    const fullTrail = [...existingTrail, ...result.trail];

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
        trail: fullTrail as unknown as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    const failedAt = new Date();
    const message = getErrorMessage(error, "Unknown browser QA error.");

    let failureTrail: unknown[] = [];
    try {
      const existingRun = await prisma.run.findUnique({
        where: { id: job.runId },
        select: { trail: true },
      });
      failureTrail = [
        ...(Array.isArray(existingRun?.trail)
          ? (existingRun.trail as unknown[])
          : []),
        {
          label: "Run failed",
          detail: message,
          timestamp: failedAt.toISOString(),
        },
      ];
    } catch {
      failureTrail = [
        {
          label: "Run failed",
          detail: message,
          timestamp: failedAt.toISOString(),
        },
      ];
    }

    await prisma.run.update({
      where: { id: job.runId },
      data: {
        status: "Failed",
        summary: "Helios could not complete the browser QA run.",
        finishedAt: failedAt,
        durationMs: failedAt.getTime() - startedAt.getTime(),
        trail: failureTrail as unknown as Prisma.InputJsonValue,
        checks: [
          {
            title: "Browser run failed",
            detail: message,
            status: "failed",
            severity: "high",
          },
        ],
      },
    });

    throw error;
  }
}

async function main() {
  const boss = await startQARunWorker(processQARun);

  console.info("QA worker is listening for queued runs.");

  const shutdown = async () => {
    await boss.stop();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

void main().catch(async (error) => {
  const message = getErrorMessage(error, "QA Worker initialization failed.");
  console.error("QA worker failed to start:", message);
  console.error(
    "Please verify PostgreSQL is running, DATABASE_URL is configured, and Playwright dependencies are installed.",
  );
  await stopQABoss().catch(() => {});
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
