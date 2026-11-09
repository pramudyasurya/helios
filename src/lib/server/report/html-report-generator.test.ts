import { describe, expect, it } from "vitest";
import { generateStandaloneHtmlReport } from "./html-report-generator";
import type { LatestRun } from "@/lib/shared/domain/types";

describe("html-report-generator", () => {
  const mockRun: LatestRun = {
    id: "run_test_123",
    status: "Completed",
    summary: "All automated assertions passed with 0 defects.",
    createdAt: "2026-11-05T10:00:00.000Z",
    finishedAt: "2026-11-05T10:00:05.000Z",
    durationMs: 5000,
    startingUrl: "https://example.com",
    finalUrl: "https://example.com/app",
    checks: [
      {
        title: "HTTP Status 200 OK",
        detail: "Server responded with HTTP 200",
        status: "passed",
        severity: "info",
      },
      {
        title: "Console Errors",
        detail: "Found 0 uncaught client exceptions",
        status: "passed",
        severity: "high",
      },
    ],
    trail: [
      {
        label: "Browser launched",
        detail: "Chromium context initialized",
        timestamp: "2026-11-05T10:00:00.000Z",
      },
    ],
    loadMetrics: {
      lcpMs: 1200,
      cls: 0.02,
      ttfbMs: 180,
      domContentLoadedMs: 450,
      loadEventMs: 800,
    },
    artifacts: {
      desktopScreenshot: "/artifacts/runs/run_test_123/desktop.png",
      mobileScreenshot: "/artifacts/runs/run_test_123/mobile.png",
    },
  };

  it("generates a self-contained HTML document with metrics and checks", async () => {
    const html = await generateStandaloneHtmlReport(mockRun, { embedScreenshotsBase64: false });

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Helios QA Audit Report - run_test_123");
    expect(html).toContain("HTTP Status 200 OK");
    expect(html).toContain("1200ms");
    expect(html).toContain("0.020");
    expect(html).toContain("180ms");
    expect(html).toContain("Chromium context initialized");
  });

  it("escapes malicious HTML in run details to prevent XSS", async () => {
    const dirtyRun: LatestRun = {
      ...mockRun,
      summary: "<script>alert('xss')</script>",
      checks: [
        {
          title: "<img src=x onerror=alert(1)>",
          detail: "<b>malicious</b>",
          status: "failed",
          severity: "high",
        },
      ],
    };

    const html = await generateStandaloneHtmlReport(dirtyRun, { embedScreenshotsBase64: false });

    expect(html).not.toContain("<script>alert('xss')</script>");
    expect(html).toContain("&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });
});
