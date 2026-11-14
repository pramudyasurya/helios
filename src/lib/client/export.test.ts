/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { downloadRunJson, downloadRunHtml } from "./export";
import type { LatestRun } from "@/lib/shared/domain/types";
describe("client export helpers", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("downloadRunJson creates a blob URL and clicks anchor", () => {
    const createObjectURLMock = vi.fn().mockReturnValue("blob:http://localhost/test-blob");
    const revokeObjectURLMock = vi.fn();
    global.URL.createObjectURL = createObjectURLMock;
    global.URL.revokeObjectURL = revokeObjectURLMock;

    const clickMock = vi.fn();
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = document.createElementNS("http://www.w3.org/1999/xhtml", tag);
      if (tag === "a") {
        el.click = clickMock;
      }
      return el;
    });

    const mockRun: LatestRun = {
      id: "run-test-123",
      startingUrl: "https://example.com",
      status: "Completed",
      summary: "Clean run",
      trail: [],
      checks: [],
      createdAt: new Date().toISOString(),
    };

    downloadRunJson(mockRun);

    expect(createObjectURLMock).toHaveBeenCalledTimes(1);
    expect(clickMock).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:http://localhost/test-blob");
  });

  it("downloadRunHtml triggers anchor click with export endpoint", () => {
    const clickMock = vi.fn();
    let createdHref = "";
    let createdDownload = "";

    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = document.createElementNS("http://www.w3.org/1999/xhtml", tag);
      if (tag === "a") {
        el.click = clickMock;
        Object.defineProperty(el, "href", {
          set: (v) => { createdHref = v; },
          get: () => createdHref,
        });
        Object.defineProperty(el, "download", {
          set: (v) => { createdDownload = v; },
          get: () => createdDownload,
        });
      }
      return el;
    });

    downloadRunHtml("run-abc-999");

    expect(clickMock).toHaveBeenCalledTimes(1);
    expect(createdHref).toContain("/api/runs/run-abc-999/export/html");
    expect(createdDownload).toBe("helios-audit-run-abc-999.html");
  });
});
