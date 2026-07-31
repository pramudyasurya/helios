import { describe, expect, it, vi, beforeEach } from "vitest";

const prismaMock = vi.hoisted(() => ({
  run: { findUnique: vi.fn(), update: vi.fn() },
  pageResult: { deleteMany: vi.fn() },
}));
const runnerMock = vi.hoisted(() => ({ runMultiRouteQA: vi.fn() }));
const trailMock = vi.hoisted(() => ({
  appendRunTrailStep: vi.fn(),
  boundTrailSteps: vi.fn((steps: unknown[]) => steps),
  redactEmbeddedUrls: vi.fn((message: string) => message),
  sanitizeTrailSteps: vi.fn((steps: unknown[]) =>
    steps.filter(
      (step) =>
        Boolean(step) &&
        typeof step === "object" &&
        typeof (step as { label?: unknown }).label === "string",
    ),
  ),
}));

vi.mock("@/lib/server/infrastructure/db/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/server/infrastructure/runner/runner", () => runnerMock);
vi.mock("@/lib/server/infrastructure/runner/trail", () => trailMock);

import { processQARun } from "@/lib/server/workers/qa-run-processor";

const job = {
  runId: "run-1",
  submittedUrl: "https://example.com",
  mode: "single" as const,
  routes: [],
};

const successfulResult = {
  id: "run-1",
  status: "Completed" as const,
  createdAt: "2026-07-31T10:00:00.000Z",
  finishedAt: "2026-07-31T10:00:05.000Z",
  durationMs: 5_000,
  summary: "Helios completed QA for 1 page(s).",
  pageResults: [],
  trail: [
    {
      label: "Run completed",
      detail: "Helios completed QA for 1 page(s).",
      timestamp: "2026-07-31T10:00:05.000Z",
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.run.update.mockResolvedValue({});
  prismaMock.pageResult.deleteMany.mockResolvedValue({ count: 0 });
  trailMock.appendRunTrailStep.mockResolvedValue([]);
});

describe("processQARun", () => {
  it("sanitizes malformed stored entries before merging the successful trail", async () => {
    prismaMock.run.findUnique.mockResolvedValueOnce({
      trail: [null, { label: "Worker started", detail: "Started", timestamp: "2026-07-31T10:00:00.000Z" }],
    });
    runnerMock.runMultiRouteQA.mockResolvedValueOnce(successfulResult);

    await processQARun(job, { retryCount: 0, retryLimit: 2 });

    expect(trailMock.sanitizeTrailSteps).toHaveBeenCalledWith([
      null,
      { label: "Worker started", detail: "Started", timestamp: "2026-07-31T10:00:00.000Z" },
    ]);
    expect(trailMock.boundTrailSteps).toHaveBeenCalledWith([
      { label: "Worker started", detail: "Started", timestamp: "2026-07-31T10:00:00.000Z" },
      successfulResult.trail[0],
    ]);
  });

  it("does not duplicate a terminal event that was already persisted", async () => {
    prismaMock.run.findUnique.mockResolvedValueOnce({
      trail: [successfulResult.trail[0]],
    });
    runnerMock.runMultiRouteQA.mockResolvedValueOnce(successfulResult);

    await processQARun(job, { retryCount: 0, retryLimit: 2 });

    expect(trailMock.boundTrailSteps).toHaveBeenCalledWith([
      successfulResult.trail[0],
    ]);
  });

  it("keeps an intermediate retry active and records the attempt failure", async () => {
    runnerMock.runMultiRouteQA.mockRejectedValueOnce(new Error("retryable failure"));

    await expect(processQARun(job, { retryCount: 0, retryLimit: 2 })).rejects.toThrow(
      "retryable failure",
    );

    expect(trailMock.appendRunTrailStep).toHaveBeenLastCalledWith(
      expect.objectContaining({ step: expect.objectContaining({ label: "Attempt 1 failed" }) }),
    );
    expect(prismaMock.run.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "Failed" }) }),
    );
  });

  it("publishes exactly one terminal failure on the final retry", async () => {
    runnerMock.runMultiRouteQA.mockRejectedValueOnce(
      new Error("Navigation failed to https://user:token@example.com/?secret=one"),
    );
    trailMock.redactEmbeddedUrls.mockReturnValueOnce("Navigation failed to https://example.com/");

    await expect(processQARun(job, { retryCount: 2, retryLimit: 2 })).rejects.toThrow(
      "Navigation failed",
    );

    expect(trailMock.appendRunTrailStep).toHaveBeenLastCalledWith(
      expect.objectContaining({
        step: expect.objectContaining({
          label: "Run failed",
          detail: "Navigation failed to https://example.com/",
        }),
      }),
    );
    expect(prismaMock.run.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "Failed" }) }),
    );
  });
});
