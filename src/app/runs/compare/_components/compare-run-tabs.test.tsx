import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { CompareRunTabs } from "./compare-run-tabs";
import type { RunComparison } from "@/lib/shared/domain/run-comparison";

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

function renderCompareRunTabs(
  comparison: RunComparison,
  visualDiff?: Parameters<typeof CompareRunTabs>[0]["visualDiff"],
) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);

  act(() => {
    root?.render(
      <CompareRunTabs
        comparison={comparison}
        checkTransitions={[]}
        visualDiff={visualDiff}
      />,
    );
  });

  return container;
}

describe("CompareRunTabs", () => {
  it("renders metric deltas with formatted values, units, and benchmark pills", () => {
    const mockComparison: RunComparison = {
      runA: { id: "run-a", createdAt: "2026-08-01T00:00:00.000Z" },
      runB: { id: "run-b", createdAt: "2026-08-02T00:00:00.000Z" },
      newIssues: [],
      resolvedIssues: [],
      recurringIssues: [],
      metricDeltas: [
        {
          key: "lcpMs",
          label: "Largest Contentful Paint",
          from: 2400,
          to: 3500,
          delta: 1100,
          percentChange: 45.8,
          direction: "regressed",
        },
        {
          key: "cls",
          label: "Cumulative Layout Shift",
          from: 0.05,
          to: 0.08,
          delta: 0.03,
          percentChange: 60,
          direction: "regressed",
        },
        {
          key: "ttfbMs",
          label: "Time to First Byte",
          from: 600,
          to: 750,
          delta: 150,
          percentChange: 25,
          direction: "regressed",
        },
      ],
    };

    const rendered = renderCompareRunTabs(mockComparison);

    // Switch to Metrics tab
    const tabs = rendered.querySelectorAll("button[role='tab']");
    const metricsTab = Array.from(tabs).find((t) => t.textContent?.includes("Metrics"));
    expect(metricsTab).toBeDefined();

    act(() => {
      metricsTab?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const content = rendered.textContent || "";

    // Verify LCP formatting and benchmark pill
    expect(content).toContain("Largest Contentful Paint");
    expect(content).toContain("2.40 s → 3.50 s");
    expect(content).toContain("+1.10s (+45.8%)");
    expect(content).toContain("Needs Imp.");

    // Verify CLS formatting and benchmark pill
    expect(content).toContain("Cumulative Layout Shift");
    expect(content).toContain("0.050 → 0.080");
    expect(content).toContain("+0.030 (+60.0%)");
    expect(content).toContain("Good");

    // Verify TTFB formatting
    expect(content).toContain("Time to First Byte");
    expect(content).toContain("0.60 s → 0.75 s");
    expect(content).toContain("+0.15s (+25.0%)");
  });

  it("renders visual diff tab with viewport switchers and diff stats", () => {
    const mockComparison: RunComparison = {
      runA: { id: "run-a", createdAt: "2026-07-20T10:00:00Z" },
      runB: { id: "run-b", createdAt: "2026-07-20T11:00:00Z" },
      newIssues: [],
      resolvedIssues: [],
      recurringIssues: [],
      metricDeltas: [],
    };

    const mockVisualDiff = {
      items: [
        {
          viewport: "desktop" as const,
          runAImage: "/artifacts/runs/run-a/desktop.png",
          runBImage: "/artifacts/runs/run-b/desktop.png",
          diffImage: "/artifacts/diffs/run-a--run-b/desktop-diff.png",
          diffPixelCount: 1540,
          diffPercentage: 1.25,
          width: 1280,
          height: 720,
          hasDiff: true,
          status: "diff" as const,
        },
        {
          viewport: "mobile" as const,
          runAImage: "/artifacts/runs/run-a/mobile.png",
          runBImage: "/artifacts/runs/run-b/mobile.png",
          diffImage: null,
          diffPixelCount: 0,
          diffPercentage: 0,
          width: 390,
          height: 844,
          hasDiff: false,
          status: "match" as const,
        },
      ],
      totalDiffPixels: 1540,
      maxDiffPercentage: 1.25,
      hasVisualDiff: true,
    };

    const rendered = renderCompareRunTabs(mockComparison, mockVisualDiff);
    const tabs = rendered.querySelectorAll("button[role='tab']");
    const visualTab = Array.from(tabs).find((t) => t.textContent?.includes("Visual Diff"));
    expect(visualTab).toBeDefined();

    act(() => {
      visualTab?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const content = rendered.textContent || "";
    expect(content).toContain("Desktop");
    expect(content).toContain("Mobile");
    expect(content).toContain("Side by Side");
    expect(content).toContain("Diff Overlay");
    expect(content).toContain("1,540 px changed");
    expect(content).toContain("1.25% diff");
    expect(content).toContain("Run A (Baseline)");
    expect(content).toContain("Run B (Target)");
  });
});
