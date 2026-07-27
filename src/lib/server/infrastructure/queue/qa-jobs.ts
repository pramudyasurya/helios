import "server-only";

import { PgBoss } from "pg-boss";
import type { RunMode } from "@/lib/server/infrastructure/runner/runner";
import { getErrorMessage } from "@/lib/shared/domain/errors";

export const QA_RUN_JOB_NAME = "qa-run";

export type QARunJob = {
  runId: string;
  submittedUrl: string;
  mode: RunMode;
  routes: string[];
  maxPages?: number;
  maxDepth?: number;
};

let bossPromise: Promise<PgBoss> | undefined;

export async function enqueueQARun(job: QARunJob): Promise<string> {
  const boss = await getQABoss();
  const jobId = await boss.send(QA_RUN_JOB_NAME, job, {
    expireInSeconds: 30 * 60,
    retryLimit: 2,
    retryDelay: 30,
    retryBackoff: true,
    singletonKey: job.runId,
    singletonSeconds: 24 * 60 * 60,
  });

  if (!jobId) {
    throw new Error(`Unable to enqueue QA run ${job.runId}.`);
  }

  return jobId;
}

export async function startQARunWorker(
  handler: (job: QARunJob) => Promise<void>,
): Promise<PgBoss> {
  const boss = await getQABoss();

  await boss.work<QARunJob>(
    QA_RUN_JOB_NAME,
    { localConcurrency: 1 },
    async (jobs) => {
      for (const job of jobs) {
        await handler(job.data);
      }
    },
  );

  return boss;
}

export async function stopQABoss(): Promise<void> {
  if (!bossPromise) return;

  const boss = await bossPromise;
  bossPromise = undefined;
  await boss.stop();
}

function getQABoss(): Promise<PgBoss> {
  if (!bossPromise) {
    bossPromise = createQABoss().catch((error) => {
      bossPromise = undefined;
      throw error;
    });
  }
  return bossPromise;
}

async function createQABoss(): Promise<PgBoss> {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL must be configured before starting the QA queue.",
    );
  }

  try {
    const boss = new PgBoss(connectionString);
    boss.on("error", (error) => {
      console.error("QA queue error:", error);
    });
    await boss.start();
    await boss.createQueue(QA_RUN_JOB_NAME, {
      expireInSeconds: 30 * 60,
      retryLimit: 2,
      retryDelay: 30,
      retryBackoff: true,
    });

    return boss;
  } catch (error) {
    throw new Error(
      `QA Worker queue failed to initialize: ${getErrorMessage(
        error,
        "Database connection failed",
      )}`,
    );
  }
}
