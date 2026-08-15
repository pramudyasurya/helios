import { randomBytes } from "crypto";
import { revalidateTag } from "next/cache";
import type { RunMode } from "@/lib/server/infrastructure/runner/runner";
import { prisma } from "@/lib/server/infrastructure/db/prisma";
import { enqueueQARun } from "@/lib/server/infrastructure/queue/qa-jobs";
import { getErrorMessage } from "@/lib/shared/domain/errors";

export type ScheduleTickJob = {
  scheduleId: string;
};

const STALE_QUEUED_MS = 10 * 60 * 1000;

// Fired by the pg-boss timekeeper for a registered schedule. Creates a fresh
// Run (origin "scheduled") and enqueues it through the standard run queue.
// Idempotency is layered: pg-boss singleton dedup collapses same-minute
// double-fires, and the DB in-flight guard (FR-019) skips when a run for this
// schedule is already Queued/Running. A Queued run older than STALE_QUEUED_MS
// is a crash orphan (created but never enqueued) and is superseded. The tick
// queue has retryLimit 0 — the cron cycle is the retry.
export async function processScheduleTick(job: ScheduleTickJob): Promise<void> {
  const schedule = await prisma.qaSchedule.findUnique({
    where: { id: job.scheduleId },
    include: { environment: true },
  });

  if (!schedule || !schedule.active || !schedule.environment?.baseUrl) {
    return;
  }

  const inFlight = await prisma.run.findFirst({
    where: {
      scheduleId: schedule.id,
      status: { in: ["Queued", "Running"] },
    },
  });

  if (inFlight) {
    if (inFlight.status !== "Queued") {
      return;
    }

    if (Date.now() - inFlight.createdAt.getTime() < STALE_QUEUED_MS) {
      return;
    }

    await prisma.run.update({
      where: { id: inFlight.id },
      data: {
        status: "Failed",
        finishedAt: new Date(),
        summary: "Marked failed: stale queued run blocked this schedule.",
        checks: [
          {
            title: "Stale queued run superseded",
            detail: `Queued at ${inFlight.createdAt.toISOString()}; marked failed after exceeding the stale threshold so the schedule could fire.`,
            status: "failed",
            severity: "high",
          },
        ],
      },
    });
  }

  const now = new Date();
  const runId = `run_${now.getTime()}_${randomBytes(4).toString("hex")}`;

  let enqueued = false;

  try {
    await prisma.run.create({
      data: {
        id: runId,
        startingUrl: schedule.environment.baseUrl,
        status: "Queued",
        summary: "Helios queued this scheduled browser QA run.",
        createdAt: now,
        trail: [
          {
            label: "Run queued",
            detail: `Helios queued a scheduled ${schedule.mode} browser QA run.`,
            timestamp: now.toISOString(),
          },
        ],
        checks: [],
        environmentId: schedule.environmentId,
        scheduleId: schedule.id,
        origin: "scheduled",
      },
    });

    await enqueueQARun({
      runId,
      submittedUrl: schedule.environment.baseUrl,
      mode: schedule.mode as RunMode,
      routes: schedule.routes,
      maxPages: schedule.maxPages ?? undefined,
      maxDepth: schedule.maxDepth ?? undefined,
    });
    enqueued = true;

    await prisma.qaSchedule.update({
      where: { id: schedule.id },
      data: { lastFiredAt: now },
    });
    try {
      revalidateTag("run-stats", "max");
    } catch (cacheError) {
      console.error(
        `[Schedule tick ${job.scheduleId}] Failed to revalidate run-stats:`,
        cacheError,
      );
    }
  } catch (error) {
    console.error(`[Schedule tick ${job.scheduleId} Error]:`, error);

    if (!enqueued) {
      const message = getErrorMessage(
        error,
        "Unable to queue the scheduled browser QA run.",
      );

      try {
        await prisma.run.update({
          where: { id: runId },
          data: {
            status: "Failed",
            summary: "Helios could not queue the scheduled browser QA run.",
            finishedAt: new Date(),
            checks: [
              {
                title: "Run queueing failed",
                detail: message,
                status: "failed",
                severity: "high",
              },
            ],
          },
        });
      } catch (updateError) {
        console.error("Failed to persist schedule tick failure:", updateError);
      }
    } else {
      try {
        await prisma.qaSchedule.update({
          where: { id: schedule.id },
          data: { lastFiredAt: now },
        });
      } catch (lastFiredError) {
        console.error(
          `[Schedule tick ${job.scheduleId}] Failed to record lastFiredAt:`,
          lastFiredError,
        );
      }
    }

    throw error;
  }
}
