import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  run: { findUnique: vi.fn() },
}));
const runRecordMock = vi.hoisted(() => ({
  runRecordToLatestRun: vi.fn(),
}));

vi.mock("@/lib/server/infrastructure/db/prisma", () => ({
  prisma: prismaMock,
}));
vi.mock("@/lib/server/infrastructure/runner/run-record", () => runRecordMock);

import type { LatestRun, RunEvidence } from "@/lib/shared/domain/types";
import { GET } from "@/app/api/runs/compare/route";

function makeEvidence(
  id: string,
  type: RunEvidence["type"],
  content: string,
): RunEvidence {
  return {
    id,
    type,
    content,
    pageUrl: "https://example.com",
    capturedAt: "2026-08-01T10:00:00.000Z",
    status: "open",
  };
}

function makeRun(id: string, overrides: Partial<LatestRun> = {}): LatestRun {
  return {
    id,
    startingUrl: "https://example.com",
    status: "Completed",
    trail: [],
    summary: "",
    checks: [],
    createdAt: "2026-08-01T10:00:00.000Z",
    ...overrides,
  };
}

function compareRequest(params: Record<string, string>) {
  const query = new URLSearchParams(params).toString();
  return new Request(`http://localhost/api/runs/compare?${query}`);
}

describe("GET /api/runs/compare", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when either run id is missing", async () => {
    const response = await GET(compareRequest({ runA: "run-1" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "Invalid query parameters",
    });
    expect(prismaMock.run.findUnique).not.toHaveBeenCalled();
  });

  it("returns 404 when either run id is unknown", async () => {
    prismaMock.run.findUnique
      .mockResolvedValueOnce({ id: "run-1" })
      .mockResolvedValueOnce(null);

    const response = await GET(
      compareRequest({ runA: "run-1", runB: "missing-b" }),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: "Not found",
    });
    expect(prismaMock.run.findUnique).toHaveBeenCalledTimes(2);
    expect(prismaMock.run.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "run-1" } }),
    );
    expect(prismaMock.run.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "missing-b" } }),
    );
  });

  it("returns a RunComparison for two valid runs", async () => {
    prismaMock.run.findUnique.mockResolvedValue({ id: "run-1" });
    runRecordMock.runRecordToLatestRun
      .mockReturnValueOnce(
        makeRun("run-1", { durationMs: 2000, evidence: [] }),
      )
      .mockReturnValueOnce(
        makeRun("run-2", {
          durationMs: 1000,
          evidence: [
            makeEvidence("ev-1", "console", "TypeError: x is undefined"),
          ],
        }),
      );

    const response = await GET(
      compareRequest({ runA: "run-1", runB: "run-2" }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.data.runA).toEqual({ id: "run-1", createdAt: "2026-08-01T10:00:00.000Z" });
    expect(body.data.runB).toEqual({ id: "run-2", createdAt: "2026-08-01T10:00:00.000Z" });
    expect(body.data.newIssues).toHaveLength(1);
    expect(body.data.newIssues[0]).toMatchObject({
      title: "TypeError: x is undefined",
      type: "console",
      severity: "low",
      evidenceIds: ["ev-1"],
      status: "new",
    });
    expect(body.data.resolvedIssues).toHaveLength(0);
    expect(body.data.recurringIssues).toHaveLength(0);

    const duration = body.data.metricDeltas.find(
      (delta: { key: string }) => delta.key === "durationMs",
    );
    expect(duration).toMatchObject({
      from: 2000,
      to: 1000,
      delta: -1000,
      percentChange: -50,
      direction: "improved",
    });
  });
});
