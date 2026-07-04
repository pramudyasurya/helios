import { describe, expect, it } from "vitest";
import {
  generateMockReport,
  generateAIReport,
} from "@/lib/helios/server/ollama";
import type { LatestRun } from "@/lib/helios/shared/types";

describe("generateMockReport", () => {
  const mockRun: LatestRun = {
    id: "run-123",
    startingUrl: "https://example.com",
    status: "Completed",
    trail: [],
    summary: "Loaded successfully",
    checks: [],
    createdAt: new Date().toISOString(),
    consoleErrors: ["TypeError: Cannot read property 'foo' of undefined"],
    failedRequests: ["https://api.example.com/data - 404 Not Found"],
    brokenImages: [],
    evidence: [
      {
        id: "ev-1",
        type: "console",
        content: "TypeError",
        pageUrl: "https://example.com",
        status: "open",
        capturedAt: new Date().toISOString(),
      },
      {
        id: "ev-2",
        type: "network",
        content: "404",
        pageUrl: "https://example.com",
        status: "open",
        capturedAt: new Date().toISOString(),
      },
    ],
  };

  it("creates high-quality structured findings from run data", () => {
    const report = generateMockReport(mockRun);
    expect(report.riskLevel).toBe("medium");
    expect(report.findings.length).toBe(2);
    expect(report.findings[0].title).toContain("Console error(s)");
    expect(report.findings[0].evidenceIds).toEqual(["ev-1"]);
    expect(report.findings[1].title).toContain("Network request(s)");
    expect(report.findings[1].evidenceIds).toEqual(["ev-2"]);
    expect(report.suggestedActions.length).toBe(2);
  });
});

describe("generateAIReport", () => {
  it("gracefully falls back to mock report when Ollama host is unreachable", async () => {
    process.env.OLLAMA_HOST = "http://localhost:9999";
    const mockRun: LatestRun = {
      id: "run-123",
      startingUrl: "https://example.com",
      status: "Completed",
      trail: [],
      summary: "Loaded",
      checks: [],
      createdAt: new Date().toISOString(),
    };
    const report = await generateAIReport(mockRun);
    expect(report).toBeDefined();
    expect(report.riskLevel).toBe("low");
    expect(report.summary).toContain("completed successfully");
  });
});
