import "server-only";

import { PgBoss, type JobWithMetadata, type ScheduleOptions } from "pg-boss";
import type { RunMode } from "@/lib/server/infrastructure/runner/runner";
import { getErrorMessage } from "@/lib/shared/domain/errors";

export const QA_RUN_JOB_NAME = "qa-run";
export const QA_SCHEDULE_TICK_NAME = "qa-schedule-tick";

export type QARunJob = {
  runId: string;
  submittedUrl: string;
  mode: RunMode;
  routes: string[];
  maxPages?: number;
  maxDepth?: number;
};

export type ScheduleTickTarget = {
  id: string;
  cronExpression: string;
  timezone: string;
};

let webBossPromise: Promise<PgBoss> | undefined;
let workerBossPromise: Promise<PgBoss> | undefined;

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

export type QARunJobMeta = {
  retryCount: number;
  retryLimit: number;
};

export function getQARunJobMeta(
  job: Pick<JobWithMetadata<QARunJob>, "retryCount" | "retryLimit">,
): QARunJobMeta {
  return { retryCount: job.retryCount, retryLimit: job.retryLimit };
}

// Tick jobs are short-lived and never retried: the cron cycle is the retry.
export function tickScheduleOptions(schedule: ScheduleTickTarget): ScheduleOptions {
  return {
    tz: schedule.timezone,
    key: schedule.id,
    singletonKey: schedule.id,
    singletonSeconds: 60,
    expireInSeconds: 300,
    retryLimit: 0,
  };
}

export async function scheduleQARunSchedule(schedule: ScheduleTickTarget): Promise<void> {
  const boss = await getQABoss();
  await boss.schedule(
    QA_SCHEDULE_TICK_NAME,
    schedule.cronExpression,
    { scheduleId: schedule.id },
    tickScheduleOptions(schedule),
  );
}

export async function unscheduleQARunSchedule(scheduleId: string): Promise<void> {
  const boss = await getQABoss();
  await boss.unschedule(QA_SCHEDULE_TICK_NAME, scheduleId);
}

export async function startQARunWorker(
  handler: (job: QARunJob, meta: QARunJobMeta) => Promise<void>,
): Promise<PgBoss> {
  const boss = await getWorkerBoss();

  await boss.work<QARunJob>(
    QA_RUN_JOB_NAME,
    { localConcurrency: 1, includeMetadata: true },
    async (jobs) => {
      const typedJobs = jobs as unknown as JobWithMetadata<QARunJob>[];
      for (const job of typedJobs) {
        await handler(job.data, getQARunJobMeta(job));
      }
    },
  );

  return boss;
}

export async function startScheduleTickWorker(
  handler: (job: { scheduleId: string }) => Promise<void>,
): Promise<PgBoss> {
  const boss = await getWorkerBoss();

  await boss.work<{ scheduleId: string }>(
    QA_SCHEDULE_TICK_NAME,
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
  const [webBoss, workerBoss] = await Promise.all([
    webBossPromise,
    workerBossPromise,
  ]);

  webBossPromise = undefined;
  workerBossPromise = undefined;

  await Promise.all([
    webBoss ? webBoss.stop() : Promise.resolve(),
    workerBoss ? workerBoss.stop() : Promise.resolve(),
  ]);
}

// Web-process boss: serves enqueue/schedule/unschedule CRUD. The timekeeper is
// disabled here; scheduled crons only fire inside the worker process.
export function getQABoss(): Promise<PgBoss> {
  if (!webBossPromise) {
    webBossPromise = createWebBoss().catch((error) => {
      webBossPromise = undefined;
      throw error;
    });
  }
  return webBossPromise;
}

function getWorkerBoss(): Promise<PgBoss> {
  if (!workerBossPromise) {
    workerBossPromise = createWorkerBoss().catch((error) => {
      workerBossPromise = undefined;
      throw error;
    });
  }
  return workerBossPromise;
}

function connectionStringOrThrow(): string {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL must be configured before starting the QA queue.",
    );
  }

  return connectionString;
}

async function createWebBoss(): Promise<PgBoss> {
  const boss = new PgBoss({
    connectionString: connectionStringOrThrow(),
    schedule: false,
  });
  boss.on("error", (error) => {
    console.error("QA queue error:", error);
  });
  await boss.start();
  await createQueues(boss);
  return boss;
}

async function createWorkerBoss(): Promise<PgBoss> {
  try {
    const boss = new PgBoss({
      connectionString: connectionStringOrThrow(),
      schedule: true,
    });
    boss.on("error", (error) => {
      console.error("QA queue error:", error);
    });
    await boss.start();
    await createQueues(boss);
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

async function createQueues(boss: PgBoss): Promise<void> {
  await boss.createQueue(QA_RUN_JOB_NAME, {
    expireInSeconds: 30 * 60,
    retryLimit: 2,
    retryDelay: 30,
    retryBackoff: true,
  });
  await boss.createQueue(QA_SCHEDULE_TICK_NAME, {
    expireInSeconds: 300,
    retryLimit: 0,
  });
}
