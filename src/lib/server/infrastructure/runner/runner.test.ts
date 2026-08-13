import { describe, expect, it } from "vitest";

import type { PageResult } from "@/lib/shared/domain/types";
import {
  buildEvidenceRows,
  pageResultToCreateInput,
} from "./evidence-builder";

const fixturePageResult: PageResult = {
  id: "page-1",
  url: "https://example.com/",
  depth: 0,
  status: "Completed",
  statusCode: 200,
  finalUrl: "https://example.com/home",
  title: "Example",
  description: "An example page",
  durationMs: 1234,
  artifacts: {
    desktopScreenshot: "/screens/desktop.png",
    mobileScreenshot: "/screens/mobile.png",
  },
  brokenImages: ["https://example.com/broken.png"],
  consoleErrors: ["[Desktop] Error: foo"],
  failedRequests: ["[Mobile] https://api.example.com - net::ERR_FAILED"],
  loadMetrics: { domContentLoadedMs: 100, loadEventMs: 200 },
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:01.000Z",
};

describe("buildEvidenceRows", () => {
  it("maps each evidence category into a row with the correct type, severity, viewport, and resource url", () => {
    const rows = buildEvidenceRows(fixturePageResult, "run-1", "page-1");

    expect(rows).toHaveLength(3);

    const [consoleRow, networkRow, imageRow] = rows;

    expect(consoleRow.type).toBe("console");
    expect(consoleRow.severity).toBe("low");
    expect(consoleRow.viewport).toBe("Desktop");
    expect(consoleRow.content).toBe("Error: foo");
    expect(consoleRow.resourceUrl).toBeUndefined();

    expect(networkRow.type).toBe("network");
    expect(networkRow.severity).toBe("medium");
    expect(networkRow.viewport).toBe("Mobile");
    expect(networkRow.content).toBe("https://api.example.com - net::ERR_FAILED");
    expect(networkRow.resourceUrl).toBe("https://api.example.com/");

    expect(imageRow.type).toBe("image");
    expect(imageRow.severity).toBe("low");
    expect(imageRow.viewport).toBeUndefined();
    expect(imageRow.content).toBe("https://example.com/broken.png");
    expect(imageRow.resourceUrl).toBe("https://example.com/broken.png");
  });

  it("stamps every row with the run id, page result id, page url, open status, and fresh timestamps", () => {
    const rows = buildEvidenceRows(fixturePageResult, "run-1", "page-1");

    for (const row of rows) {
      expect(row.runId).toBe("run-1");
      expect(row.pageResultId).toBe("page-1");
      expect(row.pageUrl).toBe("https://example.com/home");
      expect(row.status).toBe("open");
      expect(row.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      expect(row.createdAt).toBeInstanceOf(Date);
      expect(row.updatedAt).toBeInstanceOf(Date);
    }
  });

  it("falls back to the original url when the final url is absent", () => {
    const rows = buildEvidenceRows(
      { ...fixturePageResult, finalUrl: undefined },
      "run-1",
      "page-1",
    );

    expect(rows[0].pageUrl).toBe("https://example.com/");
  });

  it("returns no rows when every evidence array is empty", () => {
    const emptyPageResult: PageResult = {
      ...fixturePageResult,
      brokenImages: [],
      consoleErrors: [],
      failedRequests: [],
    };

    expect(buildEvidenceRows(emptyPageResult, "run-1", "page-1")).toEqual([]);
  });

  it("returns no rows when the evidence arrays are undefined", () => {
    const pageResult: PageResult = {
      id: "page-2",
      url: "https://example.com/",
      depth: 0,
      status: "Completed",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:01.000Z",
    };

    expect(buildEvidenceRows(pageResult, "run-1", "page-2")).toEqual([]);
  });
});

describe("pageResultToCreateInput", () => {
  it("maps every page result field onto the create input", () => {
    const input = pageResultToCreateInput(fixturePageResult, "run-1");

    expect(input).toEqual({
      id: "page-1",
      runId: "run-1",
      url: "https://example.com/",
      depth: 0,
      status: "Completed",
      statusCode: 200,
      finalUrl: "https://example.com/home",
      title: "Example",
      description: "An example page",
      durationMs: 1234,
      artifacts: {
        desktopScreenshot: "/screens/desktop.png",
        mobileScreenshot: "/screens/mobile.png",
      },
      brokenImages: ["https://example.com/broken.png"],
      consoleErrors: ["[Desktop] Error: foo"],
      failedRequests: ["[Mobile] https://api.example.com - net::ERR_FAILED"],
      loadMetrics: { domContentLoadedMs: 100, loadEventMs: 200 },
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:01.000Z"),
    });
  });
});
