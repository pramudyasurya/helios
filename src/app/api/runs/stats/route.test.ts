import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  run: {
    groupBy: vi.fn(),
    aggregate: vi.fn(),
    findMany: vi.fn(),
  },
  evidence: {
    groupBy: vi.fn(),
  },
}));

vi.mock("@/lib/server/infrastructure/db/prisma", () => ({
  prisma: prismaMock,
}));
vi.mock("@/generated/prisma/client", () => ({ Prisma: {} }));
vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

import { GET } from "@/app/api/runs/stats/route";

function statsRequest(params: Record<string, string> = {}) {
  const query = new URLSearchParams(params).toString();
  return new Request(`http://localhost/api/runs/stats?${query}`);
}

describe("GET /api/runs/stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.run.groupBy.mockResolvedValue([]);
    prismaMock.run.aggregate.mockResolvedValue({ _avg: { durationMs: 1200 } });
    prismaMock.run.findMany.mockResolvedValue([]);
    prismaMock.evidence.groupBy.mockResolvedValue([]);
  });

  it("rejects invalid query parameters", async () => {
    const response = await GET(statsRequest({ status: "Weird" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "Invalid query parameters",
    });
    expect(prismaMock.run.groupBy).not.toHaveBeenCalled();
  });

  it("keeps legacy stats keys and returns an empty timeseries without terminal runs", async () => {
    prismaMock.run.groupBy.mockResolvedValue([
      { status: "Completed", _count: { _all: 4 } },
      { status: "Failed", _count: { _all: 1 } },
    ]);

    const response = await GET(statsRequest());

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body).toEqual({
      totalRuns: 5,
      completedRuns: 4,
      failedRuns: 1,
      avgDurationMs: 1200,
      recentDurations: [],
      timeseries: [],
    });
    expect(prismaMock.evidence.groupBy).not.toHaveBeenCalled();
  });

  it("builds a chronological timeseries with passRate and aggregated errorCount", async () => {
    prismaMock.run.groupBy.mockResolvedValue([
      { status: "Completed", _count: { _all: 2 } },
      { status: "Failed", _count: { _all: 1 } },
    ]);
    prismaMock.run.findMany
      .mockResolvedValueOnce([{ durationMs: 2000 }, { durationMs: 1500 }])
      .mockResolvedValueOnce([
        { id: "run-c", status: "Failed", createdAt: new Date("2026-08-14T00:00:00.000Z") },
        { id: "run-b", status: "Completed", createdAt: new Date("2026-08-12T00:00:00.000Z") },
        { id: "run-a", status: "Completed", createdAt: new Date("2026-08-10T00:00:00.000Z") },
      ]);
    prismaMock.evidence.groupBy.mockResolvedValue([
      { runId: "run-b", _count: { _all: 3 } },
    ]);

    const response = await GET(statsRequest());

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.recentDurations).toEqual([1500, 2000]);
    expect(body.timeseries).toEqual([
      { date: "2026-08-10T00:00:00.000Z", runId: "run-a", passRate: 100, errorCount: 0 },
      { date: "2026-08-12T00:00:00.000Z", runId: "run-b", passRate: 100, errorCount: 3 },
      { date: "2026-08-14T00:00:00.000Z", runId: "run-c", passRate: 0, errorCount: 0 },
    ]);

    expect(prismaMock.run.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          status: { in: ["Completed", "Failed"] },
        }),
        take: 30,
        orderBy: { createdAt: "desc" },
      }),
    );
    expect(prismaMock.evidence.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ["runId"],
        where: expect.objectContaining({
          runId: { in: expect.arrayContaining(["run-a", "run-b", "run-c"]) },
          type: "console",
        }),
      }),
    );
  });
});
