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

function renderCompareRunTabs(comparison: RunComparison) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);

  act(() => {
    root?.render(<CompareRunTabs comparison={comparison} checkTransitions={[]} />);
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
});
