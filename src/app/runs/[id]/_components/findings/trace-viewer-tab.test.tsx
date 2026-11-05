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
    expect(element.querySelector("a[title*='Trace Viewer']")).toBeNull();
  });

  it("renders empty state when run.artifacts is completely undefined", () => {
    const runWithoutArtifacts: LatestRun = {
      ...baseRun,
      artifacts: undefined,
    };

    const element = renderTraceViewerTab(runWithoutArtifacts);

    expect(element.textContent).toContain("No trace recorded");
    expect(element.querySelector("iframe")).toBeNull();
  });

  it("renders trace viewer iframe and download button when relative trace artifact exists", () => {
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

    const downloadLink = element.querySelector("a[download]") as HTMLAnchorElement | null;
    expect(downloadLink).not.toBeNull();
    expect(downloadLink?.getAttribute("href")).toBe(tracePath);
    expect(downloadLink?.getAttribute("download")).toBe("trace-run-test-123.zip");

    const absoluteOrigin = typeof window !== "undefined" ? window.location.origin : "";
    const expectedExternalViewerUrl = `https://trace.playwright.dev/?trace=${encodeURIComponent(`${absoluteOrigin}${tracePath}`)}`;
    const externalLink = element.querySelector(
      `a[href="${expectedExternalViewerUrl}"]`,
    ) as HTMLAnchorElement | null;
    expect(externalLink).not.toBeNull();
    expect(externalLink?.getAttribute("target")).toBe("_blank");

    const expectedLocalViewerUrl = `/trace-viewer/index.html?trace=${encodeURIComponent(`${absoluteOrigin}${tracePath}`)}`;
    const iframe = element.querySelector("iframe");
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute("src")).toBe(expectedLocalViewerUrl);
    expect(iframe?.getAttribute("title")).toBe("Playwright Trace Viewer");
  });
  it("properly encodes nested and absolute trace URLs with special characters and spaces", () => {
    const nestedTracePath = "/artifacts/runs/run_1793674672531/898d4507-450b-4b07-91ca-c27f82847a63/trace.zip";
    const runWithNestedTrace: LatestRun = {
      ...baseRun,
      id: "run_1793674672531",
      artifacts: {
        desktopScreenshot: "/artifacts/runs/run_1793674672531/desktop.png",
        mobileScreenshot: "/artifacts/runs/run_1793674672531/mobile.png",
        trace: nestedTracePath,
      },
    };

    const element = renderTraceViewerTab(runWithNestedTrace);

    const absoluteOrigin = typeof window !== "undefined" ? window.location.origin : "";
    const expectedLocalUrl = `/trace-viewer/index.html?trace=${encodeURIComponent(`${absoluteOrigin}${nestedTracePath}`)}`;
    const expectedExternalUrl = `https://trace.playwright.dev/?trace=${encodeURIComponent(`${absoluteOrigin}${nestedTracePath}`)}`;
    const iframe = element.querySelector("iframe");
    expect(iframe?.getAttribute("src")).toBe(expectedLocalUrl);
    const externalLink = element.querySelector("a[target='_blank']") as HTMLAnchorElement | null;
    expect(externalLink?.getAttribute("href")).toBe(expectedExternalUrl);

    const downloadLink = element.querySelector("a[download]") as HTMLAnchorElement | null;
    expect(downloadLink?.getAttribute("download")).toBe("trace-run_1793674672531.zip");
  });

  it("handles absolute HTTP/HTTPS trace URLs correctly", () => {
    const absoluteTraceUrl = "https://qa-storage.example.com/artifacts/runs/run-123/trace.zip";
    const runWithAbsoluteTrace: LatestRun = {
      ...baseRun,
      artifacts: {
        desktopScreenshot: "/artifacts/runs/run-123/desktop.png",
        mobileScreenshot: "/artifacts/runs/run-123/mobile.png",
        trace: absoluteTraceUrl,
      },
    };

    const element = renderTraceViewerTab(runWithAbsoluteTrace);

    const expectedLocalUrl = `/trace-viewer/index.html?trace=${encodeURIComponent(absoluteTraceUrl)}`;
    const expectedExternalUrl = `https://trace.playwright.dev/?trace=${encodeURIComponent(absoluteTraceUrl)}`;

    const iframe = element.querySelector("iframe");
    expect(iframe?.getAttribute("src")).toBe(expectedLocalUrl);

    const externalLink = element.querySelector("a[target='_blank']") as HTMLAnchorElement | null;
    expect(externalLink?.getAttribute("href")).toBe(expectedExternalUrl);

    const downloadLink = element.querySelector("a[download]") as HTMLAnchorElement | null;
    expect(downloadLink?.getAttribute("href")).toBe(absoluteTraceUrl);
  });
});
