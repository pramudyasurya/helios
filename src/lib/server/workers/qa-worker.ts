import { prisma } from "@/lib/server/infrastructure/db/prisma";
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
      },
    });
  } catch (error) {
    const failedAt = new Date();
    const message = getErrorMessage(error, "Unknown browser QA error.");

    await prisma.run.update({
      where: { id: job.runId },
      data: {
        status: "Failed",
        summary: "Helios could not complete the browser QA run.",
        finishedAt: failedAt,
        durationMs: failedAt.getTime() - startedAt.getTime(),
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
  console.error("QA worker failed to start:", error);
  await stopQABoss();
  await prisma.$disconnect();
  process.exit(1);
});
