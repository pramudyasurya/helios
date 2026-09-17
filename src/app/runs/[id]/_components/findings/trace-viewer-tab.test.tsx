import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { TraceViewerTab } from "@/app/runs/[id]/_components/findings/trace-viewer-tab";
import type { LatestRun } from "@/lib/shared/domain/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let root: Root | undefined;
let container: HTMLDivElement | undefined;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
});

function renderTraceViewerTab(run: LatestRun) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);

  act(() => {
    root?.render(<TraceViewerTab run={run} />);
  });

  return container;
}

const baseRun: LatestRun = {
  id: "run-test-123",
  startingUrl: "https://example.com",
  status: "Completed",
  summary: "Completed successfully",
  trail: [],
  checks: [],
  createdAt: "2026-08-06T00:00:00.000Z",
};

describe("TraceViewerTab", () => {
  it("renders empty state when trace artifact is missing", () => {
    const runWithoutTrace: LatestRun = {
      ...baseRun,
      artifacts: {
        desktopScreenshot: "/artifacts/runs/run-test-123/desktop.png",
        mobileScreenshot: "/artifacts/runs/run-test-123/mobile.png",
      },
    };

    const element = renderTraceViewerTab(runWithoutTrace);

    expect(element.textContent).toContain("No trace recorded");
    expect(element.textContent).toContain(
      "Playwright trace recording was not captured or is not available for this run."
    );
    expect(element.querySelector("iframe")).toBeNull();
    expect(element.querySelector("a[download]")).toBeNull();
  });

  it("renders trace viewer iframe and download button when trace artifact exists", () => {
    const tracePath = "/artifacts/runs/run-test-123/trace.zip";
    const runWithTrace: LatestRun = {
      ...baseRun,
      artifacts: {
        desktopScreenshot: "/artifacts/runs/run-test-123/desktop.png",
        mobileScreenshot: "/artifacts/runs/run-test-123/mobile.png",
        trace: tracePath,
      },
    };

    const element = renderTraceViewerTab(runWithTrace);

    expect(element.textContent).toContain("Playwright Trace Inspection");
    expect(element.textContent).toContain("Action Filmstrip");
    expect(element.textContent).toContain("DOM Snapshots");
    expect(element.textContent).toContain("Network & Logs");

    // Download link
    const downloadLink = element.querySelector("a[download]") as HTMLAnchorElement | null;
    expect(downloadLink).not.toBeNull();
    expect(downloadLink?.getAttribute("href")).toBe(tracePath);
    expect(downloadLink?.getAttribute("download")).toBe("trace-run-test-123.zip");

    // External viewer link
    const expectedViewerUrl = `https://trace.playwright.dev/?trace=${encodeURIComponent(tracePath)}`;
    const externalLink = element.querySelector(
      `a[href="${expectedViewerUrl}"]`
    ) as HTMLAnchorElement | null;
    expect(externalLink).not.toBeNull();
    expect(externalLink?.getAttribute("target")).toBe("_blank");

    // Embedded iframe
    const iframe = element.querySelector("iframe");
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute("src")).toBe(expectedViewerUrl);
    expect(iframe?.getAttribute("title")).toBe("Playwright Trace Viewer");
  });
});
