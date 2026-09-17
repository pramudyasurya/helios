import { describe, expect, it, vi, beforeEach } from "vitest";

const prismaMock = vi.hoisted(() => ({
  run: { findUnique: vi.fn(), update: vi.fn() },
  pageResult: { deleteMany: vi.fn() },
  evidence: { deleteMany: vi.fn(), findMany: vi.fn() },
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
const fingerprintMock = vi.hoisted(() => ({ fingerprintRunIssues: vi.fn() }));
const aiReportMock = vi.hoisted(() => ({ generateAIReport: vi.fn() }));
const runRecordMock = vi.hoisted(() => ({ runRecordToLatestRun: vi.fn() }));

vi.mock("@/lib/server/infrastructure/db/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/server/infrastructure/runner/runner", () => runnerMock);
vi.mock("@/lib/server/infrastructure/runner/trail", () => trailMock);
vi.mock("@/lib/server/infrastructure/issues/fingerprint-issues", () => fingerprintMock);
vi.mock("@/lib/server/infrastructure/ai/report-generator", () => aiReportMock);
vi.mock("@/lib/server/infrastructure/runner/run-record", () => runRecordMock);

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
  prismaMock.evidence.deleteMany.mockResolvedValue({ count: 0 });
  prismaMock.evidence.findMany.mockResolvedValue([]);
  trailMock.appendRunTrailStep.mockResolvedValue([]);
  fingerprintMock.fingerprintRunIssues.mockResolvedValue(undefined);
  aiReportMock.generateAIReport.mockReset();
  runRecordMock.runRecordToLatestRun.mockReset();
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

describe("processQARun checks wiring", () => {
  it("computes and persists checks from page results on the success path", async () => {
    const resultWithPages = {
      ...successfulResult,
      pageResults: [
        {
          id: "page-1",
          url: "https://example.com",
          depth: 0,
          status: "Completed",
          statusCode: 200,
          finalUrl: "https://example.com",
          title: "Example",
          description: "An example site",
          durationMs: 500,
          artifacts: {
            desktopScreenshot: "/artifacts/desktop.png",
            mobileScreenshot: "/artifacts/mobile.png",
          },
          brokenImages: [],
          consoleErrors: ["Uncaught Error: test"],
          failedRequests: [],
          loadMetrics: { domContentLoadedMs: 800, loadEventMs: 1200 },
          createdAt: "2026-08-06T00:00:00.000Z",
          updatedAt: "2026-08-06T00:00:00.000Z",
        },
      ],
    };
    prismaMock.run.findUnique.mockResolvedValueOnce({ trail: [] });
    runnerMock.runMultiRouteQA.mockResolvedValueOnce(resultWithPages);

    await processQARun(job, { retryCount: 0, retryLimit: 2 });

    // Verify checks were computed and included in the run update
    const updateCall = prismaMock.run.update.mock.calls.find(
      (call) =>
        call[0]?.data?.status === "Completed",
    );
    expect(updateCall).toBeDefined();
    const checks = updateCall?.[0]?.data?.checks;
    expect(Array.isArray(checks)).toBe(true);
    expect(checks.length).toBeGreaterThan(0);
    // The "Console errors checked" check should be 'warning' since there's 1 console error
    const consoleCheck = checks.find(
      (c: { title: string }) => c.title === "Console errors checked",
    );
    expect(consoleCheck).toMatchObject({ status: "warning" });
  });

  it("attaches persisted evidence IDs to checks by evidence type", async () => {
    const resultWithPages = {
      ...successfulResult,
      pageResults: [
        {
          id: "page-1",
          url: "https://example.com",
          depth: 0,
          status: "Completed",
          statusCode: 200,
          finalUrl: "https://example.com",
          title: "Example",
          description: "An example site",
          durationMs: 500,
          artifacts: {},
          brokenImages: ["https://example.com/missing.png"],
          consoleErrors: ["[Desktop] Uncaught Error: boom"],
          failedRequests: [],
          loadMetrics: { domContentLoadedMs: 800, loadEventMs: 1200 },
          createdAt: "2026-08-06T00:00:00.000Z",
          updatedAt: "2026-08-06T00:00:00.000Z",
        },
      ],
    };
    prismaMock.run.findUnique.mockResolvedValueOnce({ trail: [] });
    runnerMock.runMultiRouteQA.mockResolvedValueOnce(resultWithPages);
    prismaMock.evidence.findMany.mockResolvedValueOnce([
      { id: "ev-console-1", type: "console", content: "Uncaught Error: boom" },
      { id: "ev-image-1", type: "image", content: "https://example.com/missing.png" },
    ]);

    await processQARun(job, { retryCount: 0, retryLimit: 2 });

    const updateCall = prismaMock.run.update.mock.calls.find(
      (call) => call[0]?.data?.status === "Completed",
    );
    const checks = updateCall?.[0]?.data?.checks as Array<{
      title: string;
      evidenceIds?: string[];
    }>;

    const consoleCheck = checks.find((c) => c.title === "Console errors checked");
    expect(consoleCheck?.evidenceIds).toEqual(["ev-console-1"]);
    const imageCheck = checks.find((c) => c.title === "Broken images checked");
    expect(imageCheck?.evidenceIds).toEqual(["ev-image-1"]);
    const networkCheck = checks.find(
      (c) => c.title === "Failed network requests checked",
    );
    expect(networkCheck?.evidenceIds).toBeUndefined();
  });
});

describe("processQARun fingerprint hook", () => {
  it("fingerprints issues on the success path after persisting the run", async () => {
    prismaMock.run.findUnique.mockResolvedValueOnce({ trail: [] });
    runnerMock.runMultiRouteQA.mockResolvedValueOnce(successfulResult);

    await processQARun(job, { retryCount: 0, retryLimit: 2 });

    expect(fingerprintMock.fingerprintRunIssues).toHaveBeenCalledWith("run-1");
  });

  it("treats fingerprinting as best-effort and never fails the run", async () => {
    prismaMock.run.findUnique.mockResolvedValueOnce({ trail: [] });
    runnerMock.runMultiRouteQA.mockResolvedValueOnce(successfulResult);
    fingerprintMock.fingerprintRunIssues.mockRejectedValueOnce(
      new Error("fingerprint db failure"),
    );

    await expect(
      processQARun(job, { retryCount: 0, retryLimit: 2 }),
    ).resolves.toBeUndefined();

    expect(prismaMock.run.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "Completed" }) }),
    );
  });
});

describe("processQARun auto AI report generation", () => {
  it("generates and updates AI report on successful run completion", async () => {
    const mockCompletedRun = {
      id: "run-1",
      status: "Completed",
      startingUrl: "https://example.com",
      evidence: [],
    };
    const mockLatestRun = { id: "run-1", status: "Completed" };
    const mockReport = {
      summary: "QA run completed without errors.",
      riskLevel: "low",
      findings: [],
      suggestedActions: ["No actions needed."],
    };

    // First findUnique is for existing trail
    prismaMock.run.findUnique.mockResolvedValueOnce({ trail: [] });
    // Second findUnique is for completed run with evidence
    prismaMock.run.findUnique.mockResolvedValueOnce(mockCompletedRun);

    runnerMock.runMultiRouteQA.mockResolvedValueOnce(successfulResult);
    runRecordMock.runRecordToLatestRun.mockReturnValueOnce(mockLatestRun);
    aiReportMock.generateAIReport.mockResolvedValueOnce(mockReport);

    await processQARun(job, { retryCount: 0, retryLimit: 2 });

    expect(prismaMock.run.findUnique).toHaveBeenCalledWith({
      where: { id: "run-1" },
      include: { evidence: true },
    });
    expect(runRecordMock.runRecordToLatestRun).toHaveBeenCalledWith(mockCompletedRun);
    expect(aiReportMock.generateAIReport).toHaveBeenCalledWith(mockLatestRun);
    expect(prismaMock.run.update).toHaveBeenCalledWith({
      where: { id: "run-1" },
      data: { report: mockReport },
    });
  });

  it("catches AI generation failures without failing the QA run", async () => {
    const mockCompletedRun = { id: "run-1", status: "Completed", evidence: [] };
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    prismaMock.run.findUnique.mockResolvedValueOnce({ trail: [] });
    prismaMock.run.findUnique.mockResolvedValueOnce(mockCompletedRun);

    runnerMock.runMultiRouteQA.mockResolvedValueOnce(successfulResult);
    runRecordMock.runRecordToLatestRun.mockReturnValueOnce({ id: "run-1" });
    aiReportMock.generateAIReport.mockRejectedValueOnce(new Error("AI generation timeout"));

    await expect(
      processQARun(job, { retryCount: 0, retryLimit: 2 }),
    ).resolves.toBeUndefined();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Auto AI report generation failed",
      expect.any(Error),
    );
    consoleErrorSpy.mockRestore();
  });

  it("skips report generation if run record is not found", async () => {
    prismaMock.run.findUnique.mockResolvedValueOnce({ trail: [] });
    prismaMock.run.findUnique.mockResolvedValueOnce(null);

    runnerMock.runMultiRouteQA.mockResolvedValueOnce(successfulResult);

    await processQARun(job, { retryCount: 0, retryLimit: 2 });

    expect(aiReportMock.generateAIReport).not.toHaveBeenCalled();
  });
});
