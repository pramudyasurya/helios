import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  qaSchedule: { findUnique: vi.fn(), update: vi.fn() },
  run: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
}));
const queueMock = vi.hoisted(() => ({ enqueueQARun: vi.fn() }));
const cacheMock = vi.hoisted(() => ({ revalidateTag: vi.fn() }));

vi.mock("@/lib/server/infrastructure/db/prisma", () => ({
  prisma: prismaMock,
}));
vi.mock("@/lib/server/infrastructure/queue/qa-jobs", () => queueMock);
vi.mock("next/cache", () => cacheMock);

import { processScheduleTick } from "@/lib/server/workers/schedule-tick-processor";

const schedule = {
  id: "sched-1",
  environmentId: "env-1",
  cronExpression: "17 2 * * *",
  timezone: "UTC",
  mode: "single",
  routes: ["https://example.com/"],
  maxPages: 3,
  maxDepth: 1,
  active: true,
  lastFiredAt: null,
  environment: { baseUrl: "https://example.com" },
};

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.qaSchedule.findUnique.mockResolvedValue(schedule);
  prismaMock.run.findFirst.mockResolvedValue(null);
  prismaMock.run.create.mockResolvedValue({ id: "run_1" });
  prismaMock.qaSchedule.update.mockResolvedValue({});
  queueMock.enqueueQARun.mockResolvedValue("job-1");
  cacheMock.revalidateTag.mockResolvedValue(undefined);
});

describe("processScheduleTick", () => {
  it("creates a scheduled run, enqueues it, and records lastFiredAt", async () => {
    await processScheduleTick({ scheduleId: "sched-1" });

    expect(prismaMock.run.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          startingUrl: "https://example.com",
          status: "Queued",
          environmentId: "env-1",
          scheduleId: "sched-1",
          origin: "scheduled",
        }),
      }),
    );

    expect(queueMock.enqueueQARun).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: expect.stringMatching(/^run_\d+_[0-9a-f]+$/),
        submittedUrl: "https://example.com",
        mode: "single",
        routes: ["https://example.com/"],
        maxPages: 3,
        maxDepth: 1,
      }),
    );

    expect(prismaMock.qaSchedule.update).toHaveBeenCalledWith({
      where: { id: "sched-1" },
      data: { lastFiredAt: expect.any(Date) },
    });
    expect(cacheMock.revalidateTag).toHaveBeenCalledWith("run-stats", "max");
  });

  it("skips creating a run when one is already in flight", async () => {
    prismaMock.run.findFirst.mockResolvedValue({
      id: "run-existing",
      status: "Queued",
      createdAt: new Date(),
    });

    await processScheduleTick({ scheduleId: "sched-1" });

    expect(prismaMock.run.create).not.toHaveBeenCalled();
    expect(queueMock.enqueueQARun).not.toHaveBeenCalled();
    expect(prismaMock.qaSchedule.update).not.toHaveBeenCalled();
  });

  it("supersedes a stale queued run and fires a fresh one", async () => {
    prismaMock.run.findFirst.mockResolvedValue({
      id: "run-stale",
      status: "Queued",
      createdAt: new Date(Date.now() - 11 * 60 * 1000),
    });

    await processScheduleTick({ scheduleId: "sched-1" });

    expect(prismaMock.run.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "run-stale" },
        data: expect.objectContaining({ status: "Failed" }),
      }),
    );
    expect(prismaMock.run.create).toHaveBeenCalled();
    expect(queueMock.enqueueQARun).toHaveBeenCalled();
  });

  it("never supersedes a running run regardless of age", async () => {
    prismaMock.run.findFirst.mockResolvedValue({
      id: "run-running",
      status: "Running",
      createdAt: new Date(Date.now() - 60 * 60 * 1000),
    });

    await processScheduleTick({ scheduleId: "sched-1" });

    expect(prismaMock.run.update).not.toHaveBeenCalled();
    expect(prismaMock.run.create).not.toHaveBeenCalled();
    expect(queueMock.enqueueQARun).not.toHaveBeenCalled();
  });

  it("no-ops when the schedule is paused", async () => {
    prismaMock.qaSchedule.findUnique.mockResolvedValue({
      ...schedule,
      active: false,
    });

    await processScheduleTick({ scheduleId: "sched-1" });

    expect(prismaMock.run.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.run.create).not.toHaveBeenCalled();
    expect(queueMock.enqueueQARun).not.toHaveBeenCalled();
  });

  it("no-ops when the environment has no base URL", async () => {
    prismaMock.qaSchedule.findUnique.mockResolvedValue({
      ...schedule,
      environment: { baseUrl: null },
    });

    await processScheduleTick({ scheduleId: "sched-1" });

    expect(prismaMock.run.create).not.toHaveBeenCalled();
    expect(queueMock.enqueueQARun).not.toHaveBeenCalled();
  });

  it("marks the run failed and rethrows when enqueueing fails", async () => {
    queueMock.enqueueQARun.mockRejectedValueOnce(new Error("queue down"));

    await expect(
      processScheduleTick({ scheduleId: "sched-1" }),
    ).rejects.toThrow("queue down");

    expect(prismaMock.run.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: expect.stringMatching(/^run_\d+_[0-9a-f]+$/) },
        data: expect.objectContaining({
          status: "Failed",
          summary: "Helios could not queue the scheduled browser QA run.",
        }),
      }),
    );
  });

  it("does not mark the run failed when only post-enqueue bookkeeping fails", async () => {
    prismaMock.qaSchedule.update.mockRejectedValueOnce(new Error("db down"));

    await expect(
      processScheduleTick({ scheduleId: "sched-1" }),
    ).rejects.toThrow("db down");

    expect(prismaMock.run.update).not.toHaveBeenCalled();
    expect(queueMock.enqueueQARun).toHaveBeenCalled();
  });
});
