import { describe, it, expect } from "vitest";
import type { CheckInput, CreateRunResponse, PageResult } from "@/lib/shared/domain/types";
import { createChecksFromRunResult, runChecks, runPageChecks, toCheckInput } from "@/lib/shared/domain/checks";

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

describe("runPageChecks", () => {
  it("marks the console check as warning when console errors are present", () => {
    const input: CheckInput = {
      url: "https://example.com",
      consoleErrors: ["Error"],
      failedRequests: [],
      brokenImages: [],
    };

    const checks = runPageChecks(input);
    const consoleCheck = checks.find(
      (check) => check.title === "Console errors checked",
    );

    expect(consoleCheck).toMatchObject({
      status: "warning",
      evidenceType: "console",
    });
  });
});

describe("runChecks", () => {
  it("returns an empty array for no inputs", () => {
    expect(runChecks([])).toEqual([]);
  });

  it("matches runPageChecks for a single input", () => {
    const input: CheckInput = {
      url: "https://example.com",
      consoleErrors: [],
      failedRequests: [],
      brokenImages: [],
    };

    expect(runChecks([input])).toEqual(runPageChecks(input));
  });

  it("merges checks across pages with worst status winning", () => {
    const cleanPage: CheckInput = {
      url: "https://example.com/a",
      consoleErrors: [],
      failedRequests: [],
      brokenImages: [],
    };
    const erroringPage: CheckInput = {
      url: "https://example.com/b",
      consoleErrors: ["Error on B"],
      failedRequests: [],
      brokenImages: [],
    };

    const merged = runChecks([cleanPage, erroringPage]);
    const consoleCheck = merged.find(
      (check) => check.title === "Console errors checked",
    );

    expect(consoleCheck).toMatchObject({
      status: "warning",
      evidenceType: "console",
      detail: "1 console error(s) captured.",
    });
  });

  it("surfaces the highest severity across pages even when status is equal", () => {
    // Page A: no loadMetrics → status 'warning', severity 'low'
    // Page B: slow load (domContentLoadedMs >= 5000) → status 'warning', severity 'medium'
    // Both have status 'warning' but severity must be 'medium' (highest)
    const noMetricsPage: CheckInput = {
      url: "https://example.com/a",
      consoleErrors: [],
      failedRequests: [],
      brokenImages: [],
    };
    const slowPage: CheckInput = {
      url: "https://example.com/b",
      loadMetrics: { domContentLoadedMs: 6000, loadEventMs: 7000 },
      consoleErrors: [],
      failedRequests: [],
      brokenImages: [],
    };

    const merged = runChecks([noMetricsPage, slowPage]);
    const metricsCheck = merged.find(
      (check) => check.title === "Page load metrics captured",
    );

    expect(metricsCheck).toMatchObject({
      status: "warning",
      severity: "medium",
    });
  });
});

describe("toCheckInput", () => {
  it("maps a populated PageResult to CheckInput", () => {
    const page: PageResult = {
      id: "page_1",
      url: "https://example.com/page",
      depth: 0,
      status: "Completed",
      statusCode: 200,
      finalUrl: "https://example.com/page/final",
      title: "Page Title",
      description: "Page description",
      durationMs: 1500,
      artifacts: {
        desktopScreenshot: "data:image/png;base64,desktop",
        mobileScreenshot: "data:image/png;base64,mobile",
      },
      brokenImages: ["broken1"],
      consoleErrors: ["error1"],
      failedRequests: ["failed1"],
      loadMetrics: { domContentLoadedMs: 800, loadEventMs: 1200 },
      createdAt: "2026-08-06T00:00:00.000Z",
      updatedAt: "2026-08-06T00:00:00.000Z",
    };

    expect(toCheckInput(page)).toEqual({
      url: "https://example.com/page",
      finalUrl: "https://example.com/page/final",
      statusCode: 200,
      title: "Page Title",
      description: "Page description",
      loadMetrics: { domContentLoadedMs: 800, loadEventMs: 1200 },
      screenshots: {
        desktop: "data:image/png;base64,desktop",
        mobile: "data:image/png;base64,mobile",
      },
      consoleErrors: ["error1"],
      failedRequests: ["failed1"],
      brokenImages: ["broken1"],
    });
  });

  it("defaults missing collections to empty arrays and screenshots to undefined", () => {
    const page: PageResult = {
      id: "page_2",
      url: "https://example.com/bare",
      depth: 1,
      status: "Completed",
      createdAt: "2026-08-06T00:00:00.000Z",
      updatedAt: "2026-08-06T00:00:00.000Z",
    };

    expect(toCheckInput(page)).toEqual({
      url: "https://example.com/bare",
      finalUrl: undefined,
      statusCode: undefined,
      title: undefined,
      description: undefined,
      loadMetrics: undefined,
      screenshots: undefined,
      consoleErrors: [],
      failedRequests: [],
      brokenImages: [],
    });
  });
});
