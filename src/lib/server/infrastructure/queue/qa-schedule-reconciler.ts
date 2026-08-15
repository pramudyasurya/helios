import type { PgBoss } from "pg-boss";
import { prisma } from "@/lib/server/infrastructure/db/prisma";
import {
  QA_SCHEDULE_TICK_NAME,
  tickScheduleOptions,
} from "@/lib/server/infrastructure/queue/qa-jobs";

// QaSchedule rows are the source of truth; pg-boss scheduled entries are a
// rebuildable derived projection. Re-register every active schedule
// (idempotent upsert) and prune entries whose schedule is gone or paused.
export async function reconcileQARunSchedules(
  boss: PgBoss,
): Promise<{ registered: number; removed: number }> {
  const activeSchedules = await prisma.qaSchedule.findMany({
    where: { active: true },
    select: { id: true, cronExpression: true, timezone: true },
  });

  let registered = 0;
  for (const schedule of activeSchedules) {
    await boss.schedule(
      QA_SCHEDULE_TICK_NAME,
      schedule.cronExpression,
      { scheduleId: schedule.id },
      tickScheduleOptions(schedule),
    );
    registered += 1;
  }

  const activeIds = new Set(activeSchedules.map((schedule) => schedule.id));
  const existing = await boss.getSchedules(QA_SCHEDULE_TICK_NAME);

  let removed = 0;
  for (const entry of existing) {
    if (!activeIds.has(entry.key)) {
      await boss.unschedule(QA_SCHEDULE_TICK_NAME, entry.key);
      removed += 1;
    }
  }

  return { registered, removed };
}
