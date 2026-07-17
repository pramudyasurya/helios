import { describe, it, expect } from "vitest";
import type { CreateRunResponse } from "@/lib/shared/domain/types";
import { createChecksFromRunResult } from "@/lib/shared/domain/checks";

function createMockRun(
  overrides: Partial<CreateRunResponse> = {},
): CreateRunResponse {
  return {
    id: "run_abc123",
    startingUrl: "https://example.com",
    finalUrl: "https://example.com/dashboard",
    status: "Completed" as const,
    title: "Dashboard - Example",
    description: "Main dashboard page for example.com",
    createdAt: "2026-06-24T08:00:00.000Z",
    finishedAt: "2026-06-24T08:00:05.000Z",
    durationMs: 5000,
    summary: "Run completed successfully",
    trail: [
      {
        label: "Navigate",
        detail: "Navigated to https://example.com",
        timestamp: "2026-06-24T08:00:00.000Z",
      },
      {
        label: "Click",
        detail: "Clicked on dashboard link",
        timestamp: "2026-06-24T08:00:02.000Z",
      },
    ],
    artifacts: {
      desktopScreenshot: "data:image/png;base64,desktop123...",
      mobileScreenshot: "data:image/png;base64,mobile456...",
    },
    brokenImages: [],
    consoleErrors: [],
    failedRequests: [],
    loadMetrics: {
      domContentLoadedMs: 1200,
      loadEventMs: 3500,
    },
    ...overrides,
  };
}

describe("createChecksFromRunResult", () => {
  it("marks the console check with console evidence", () => {
    const mockRun = createMockRun({
      consoleErrors: ["[Desktop] Error test"],
    });

    const checks = createChecksFromRunResult(mockRun);
    const consoleCheck = checks.find(
      (check) => check.title === "Console errors checked",
    );

    expect(consoleCheck).toMatchObject({
      status: "warning",
      evidenceType: "console",
    });
  });
  it("marks the console check as passed", () => {
    const mockRun = createMockRun();
    const checks = createChecksFromRunResult(mockRun);
    const consoleCheck = checks.find(
      (check) => check.title === "Console errors checked",
    );
    expect(consoleCheck).toMatchObject({
      status: "passed",
      evidenceType: undefined,
    });
  });

  it("marks broken image with image evidence", () => {
    const mockRun = createMockRun({
      brokenImages: ["[Desktop] https://example.com/broken-image.png"],
    });

    const checks = createChecksFromRunResult(mockRun);

    const imageCheck = checks.find(
      (check) => check.title === "Broken images checked",
    );

    expect(imageCheck).toMatchObject({
      status: "warning",
      evidenceType: "image",
    });
  });

  it("marks failed requests with network evidence", () => {
    const mockRun = createMockRun({
      failedRequests: ["[Desktop] https://example.com/api - net::ERR_FAILED"],
    });

    const checks = createChecksFromRunResult(mockRun);

    const networkCheck = checks.find(
      (check) => check.title === "Failed network requests checked",
    );

    expect(networkCheck).toMatchObject({
      status: "warning",
      evidenceType: "network",
    });
  });
});
