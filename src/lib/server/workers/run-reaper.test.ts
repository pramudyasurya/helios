import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  run: {
    findMany: vi.fn(),
    update: vi.fn(),
  },
}));

const trailMock = vi.hoisted(() => ({
  appendRunTrailStep: vi.fn(),
  createTerminalRunTrailStep: vi.fn(({ status, summary, timestamp }: { status: "Completed" | "Failed"; summary: string; timestamp: string }) => ({
    label: status === "Completed" ? "Run completed" : "Run failed",
    detail: summary,
    timestamp,
  })),
}));

vi.mock("@/lib/server/infrastructure/db/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/server/infrastructure/runner/trail", () => trailMock);

import { reapStuckRuns, STUCK_RUN_TIMEOUT_MS } from "./run-reaper";

describe("reapStuckRuns", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.run.findMany.mockResolvedValue([]);
    prismaMock.run.update.mockResolvedValue({});
    trailMock.appendRunTrailStep.mockResolvedValue(undefined);
  });

  it("returns 0 reaped runs when no runs are stuck past the timeout", async () => {
    const result = await reapStuckRuns();
    expect(result).toEqual({ reapedRunIds: [], count: 0 });
    expect(prismaMock.run.update).not.toHaveBeenCalled();
  });

  it("terminates and marks stuck runs as Failed with watchdog trail step", async () => {
    const stuckRun = {
      id: "run-stuck-1",
      status: "Running",
      createdAt: new Date(Date.now() - 35 * 60 * 1000),
    };
    prismaMock.run.findMany.mockResolvedValueOnce([stuckRun]);

    const result = await reapStuckRuns(STUCK_RUN_TIMEOUT_MS);

    expect(result).toEqual({ reapedRunIds: ["run-stuck-1"], count: 1 });
    expect(prismaMock.run.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "run-stuck-1" },
        data: expect.objectContaining({
          status: "Failed",
          summary: expect.stringContaining("watchdog terminated run"),
        }),
      }),
    );
    expect(trailMock.appendRunTrailStep).toHaveBeenCalled();
  });

  it("reaps multiple stuck runs independently", async () => {
    const runs = [
      { id: "run-1", status: "Running", createdAt: new Date(Date.now() - 40 * 60 * 1000) },
      { id: "run-2", status: "Queued", createdAt: new Date(Date.now() - 60 * 60 * 1000) },
    ];
    prismaMock.run.findMany.mockResolvedValueOnce(runs);

    const result = await reapStuckRuns(1000);

    expect(result.count).toBe(2);
    expect(result.reapedRunIds).toEqual(["run-1", "run-2"]);
    expect(prismaMock.run.update).toHaveBeenCalledTimes(2);
  });
});
