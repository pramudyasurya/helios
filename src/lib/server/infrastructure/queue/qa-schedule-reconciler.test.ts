import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PgBoss } from "pg-boss";

const prismaMock = vi.hoisted(() => ({
  qaSchedule: { findMany: vi.fn() },
}));

vi.mock("@/lib/server/infrastructure/db/prisma", () => ({
  prisma: prismaMock,
}));

import { QA_SCHEDULE_TICK_NAME } from "@/lib/server/infrastructure/queue/qa-jobs";
import { reconcileQARunSchedules } from "@/lib/server/infrastructure/queue/qa-schedule-reconciler";

function createBossMock() {
  return {
    schedule: vi.fn().mockResolvedValue(undefined),
    unschedule: vi.fn().mockResolvedValue(undefined),
    getSchedules: vi.fn().mockResolvedValue([]),
  } as unknown as PgBoss;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("reconcileQARunSchedules", () => {
  it("registers every active schedule with tick options keyed by id", async () => {
    prismaMock.qaSchedule.findMany.mockResolvedValue([
      { id: "sched-1", cronExpression: "17 2 * * *", timezone: "UTC" },
      { id: "sched-2", cronExpression: "42 4 * * 1", timezone: "America/New_York" },
    ]);
    const boss = createBossMock();

    const result = await reconcileQARunSchedules(boss);

    expect(result).toEqual({ registered: 2, removed: 0 });
    expect(boss.schedule).toHaveBeenCalledWith(
      QA_SCHEDULE_TICK_NAME,
      "17 2 * * *",
      { scheduleId: "sched-1" },
      expect.objectContaining({
        tz: "UTC",
        key: "sched-1",
        singletonKey: "sched-1",
        singletonSeconds: 60,
        expireInSeconds: 300,
        retryLimit: 0,
      }),
    );
    expect(boss.schedule).toHaveBeenCalledWith(
      QA_SCHEDULE_TICK_NAME,
      "42 4 * * 1",
      { scheduleId: "sched-2" },
      expect.objectContaining({ tz: "America/New_York", key: "sched-2" }),
    );
  });

  it("prunes pg-boss entries whose key is not an active schedule", async () => {
    prismaMock.qaSchedule.findMany.mockResolvedValue([
      { id: "sched-1", cronExpression: "17 2 * * *", timezone: "UTC" },
    ]);
    const boss = createBossMock();
    boss.getSchedules = vi.fn().mockResolvedValue([
      { name: QA_SCHEDULE_TICK_NAME, key: "sched-1", cron: "17 2 * * *", timezone: "UTC" },
      { name: QA_SCHEDULE_TICK_NAME, key: "sched-stale", cron: "0 3 * * *", timezone: "UTC" },
      { name: QA_SCHEDULE_TICK_NAME, key: "sched-paused", cron: "0 4 * * *", timezone: "UTC" },
    ] as never);

    const result = await reconcileQARunSchedules(boss);

    expect(result).toEqual({ registered: 1, removed: 2 });
    expect(boss.unschedule).toHaveBeenCalledWith(
      QA_SCHEDULE_TICK_NAME,
      "sched-stale",
    );
    expect(boss.unschedule).toHaveBeenCalledWith(
      QA_SCHEDULE_TICK_NAME,
      "sched-paused",
    );
    expect(boss.unschedule).not.toHaveBeenCalledWith(
      QA_SCHEDULE_TICK_NAME,
      "sched-1",
    );
  });

  it("returns zero counts when there are no active schedules", async () => {
    prismaMock.qaSchedule.findMany.mockResolvedValue([]);
    const boss = createBossMock();

    const result = await reconcileQARunSchedules(boss);

    expect(result).toEqual({ registered: 0, removed: 0 });
    expect(boss.schedule).not.toHaveBeenCalled();
  });
});
