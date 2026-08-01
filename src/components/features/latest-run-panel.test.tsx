import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LatestRunPanel } from "@/components/features/latest-run-panel";
import type { LatestRun } from "@/lib/shared/domain/types";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
let container: HTMLDivElement | undefined;

function renderPanel(props: { latestRun: LatestRun | null; onReset?: () => void }) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);

  const onReset = props.onReset ?? vi.fn();

  act(() => {
    root?.render(<LatestRunPanel latestRun={props.latestRun} onReset={onReset} />);
  });

  return { container, onReset };
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
});

describe("LatestRunPanel", () => {
  it("renders idle state when latestRun is null", () => {
    const { container } = renderPanel({ latestRun: null });
    expect(container?.textContent).toContain("Latest Run");
    expect(container?.textContent).toContain("No QA runs yet");
    expect(container?.textContent).toContain("Submit a URL above");
  });

  it("renders active queued/running state with live activity and polite aria status announcement", () => {
    const activeRun: LatestRun = {
      id: "run-active-1",
      startingUrl: "https://example.com",
      status: "Running",
      summary: "",
      checks: [],
      createdAt: "2026-08-01T10:00:00.000Z",
      trail: [
        {
          label: "Worker started",
          detail: "Initiated execution.",
          timestamp: "2026-08-01T10:00:01.000Z",
        },
      ],
    };

    const { container } = renderPanel({ latestRun: activeRun });

    const liveAnnouncement = container?.querySelector('[aria-live="polite"]');
    expect(liveAnnouncement?.textContent).toContain("QA run in progress: status Running");
    expect(container?.textContent).toContain("Worker started:");
  });

  it("renders completed state with summary card and diagnostic activity disclosure", () => {
    const completedRun: LatestRun = {
      id: "run-completed-1",
      startingUrl: "https://example.com",
      status: "Completed",
      summary: "QA check completed successfully with zero defects.",
      checks: [],
      createdAt: "2026-08-01T10:00:00.000Z",
      trail: [
        {
          label: "Run completed",
          detail: "All verification steps passed.",
          timestamp: "2026-08-01T10:00:05.000Z",
        },
      ],
    };

    const { container } = renderPanel({ latestRun: completedRun });

    expect(container?.textContent).toContain("QA check completed successfully");

    const disclosure = container?.querySelector("details");
    expect(disclosure).not.toBeNull();
    expect(disclosure?.textContent).toContain("Execution Activity Log (1 steps)");

    const exportBtn = container?.querySelector("button");
    expect(exportBtn?.textContent).toContain("Export JSON");

    const viewLink = container?.querySelector("a");
    expect(viewLink?.getAttribute("href")).toBe("/runs/run-completed-1");
  });

  it("renders failed state with explicit visible failure reason callout preferring failure step over generic summary", () => {
    const failedRun: LatestRun = {
      id: "run-failed-1",
      startingUrl: "https://example.com",
      status: "Failed",
      summary: "QA run finished with status Failed.",
      checks: [],
      createdAt: "2026-08-01T10:00:00.000Z",
      trail: [
        {
          label: "Worker failed",
          detail: "Target host unreachable due to network timeout.",
          timestamp: "2026-08-01T10:00:05.000Z",
        },
      ],
    };

    const { container } = renderPanel({ latestRun: failedRun });

    const alertBox = container?.querySelector('[role="alert"]');
    expect(alertBox).not.toBeNull();
    expect(alertBox?.textContent).toContain("Failure Reason");
    expect(alertBox?.textContent).toContain("Worker failed: Target host unreachable");
  });

  it("invokes onReset handler when reset button is clicked", () => {
    const completedRun: LatestRun = {
      id: "run-completed-1",
      startingUrl: "https://example.com",
      status: "Completed",
      summary: "Clean run.",
      checks: [],
      createdAt: "2026-08-01T10:00:00.000Z",
      trail: [],
    };

    const onReset = vi.fn();
    const { container } = renderPanel({ latestRun: completedRun, onReset });

    const buttons = Array.from(container.querySelectorAll("button"));
    const resetBtn = buttons.find((btn) => btn.textContent?.includes("Reset"));

    expect(resetBtn).not.toBeUndefined();

    act(() => {
      resetBtn?.click();
    });

    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
