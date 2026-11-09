import { describe, expect, it } from "vitest";
import { generateStandaloneHtmlReport } from "./html-report-generator";
import type { LatestRun } from "@/lib/shared/domain/types";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

describe("html-report-generator E2E artifact embedding", () => {
  it("embeds real screenshot images from disk as base64 data URIs into a standalone HTML file", async () => {
    const testArtifactsDir = path.join(process.cwd(), "public", "artifacts", "runs", "test-run-e2e");
    await mkdir(testArtifactsDir, { recursive: true });

    // 1x1 transparent PNG buffer
    const pngBuffer = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
    await writeFile(path.join(testArtifactsDir, "desktop.png"), pngBuffer);
    await writeFile(path.join(testArtifactsDir, "mobile.png"), pngBuffer);

    const run: LatestRun = {
      id: "test-run-e2e",
      status: "Completed",
      startingUrl: "https://example.com",
      finalUrl: "https://example.com",
      summary: "E2E verification of standalone report artifact generator.",
      createdAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 3200,
      checks: [
        {
          title: "Synthetic User Journey: Login & Navigate",
          detail: "9 of 9 actions verified successfully",
          status: "passed",
          severity: "info",
        },
        {
          title: "LCP Threshold Check",
          detail: "LCP measured at 850ms (canonical < 2500ms)",
          status: "passed",
          severity: "info",
        },
      ],
      trail: [
        {
          label: "Browser launched",
          detail: "Chromium context initialized",
          timestamp: new Date().toISOString(),
        },
        {
          label: "Journey Step: click (#submit-btn)",
          detail: "Completed in 42ms",
          timestamp: new Date().toISOString(),
        },
      ],
      loadMetrics: {
        lcpMs: 850,
        cls: 0.012,
        ttfbMs: 140,
        domContentLoadedMs: 310,
        loadEventMs: 620,
      },
      artifacts: {
        desktopScreenshot: "/artifacts/runs/test-run-e2e/desktop.png",
        mobileScreenshot: "/artifacts/runs/test-run-e2e/mobile.png",
      },
    };

    const standaloneHtml = await generateStandaloneHtmlReport(run, {
      embedScreenshotsBase64: true,
    });

    expect(standaloneHtml).toContain("<!DOCTYPE html>");
    expect(standaloneHtml).toContain("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB");
    expect(standaloneHtml).toContain("Synthetic User Journey: Login &amp; Navigate");
    expect(standaloneHtml).toContain("850ms");
    expect(standaloneHtml).toContain("0.012");
    expect(standaloneHtml).toContain("Offline Portable Report");
  });
});
