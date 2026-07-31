import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { RunActivityConsole } from "@/components/features/run-activity-console";
import type { TrailStep } from "@/lib/shared/domain/types";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
let container: HTMLDivElement | undefined;

function renderConsole(props: { status?: string; trail?: TrailStep[] }) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);

  act(() => {
    root?.render(<RunActivityConsole {...props} />);
  });
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
});

describe("RunActivityConsole", () => {
  it("renders idle empty state when no trail is provided", () => {
    renderConsole({});
    expect(container?.textContent).toContain("Run Activity Log");
    expect(container?.textContent).toContain(
      "No activity recorded yet for the latest run.",
    );
  });

  it("renders active waiting state when status is Running but trail is empty", () => {
    renderConsole({ status: "Running", trail: [] });
    expect(container?.textContent).toContain("Live");
    expect(container?.textContent).toContain(
      "Waiting for live activity milestones...",
    );
  });

  it("renders trail steps in order and limits rendering to the latest 8 steps", () => {
    const steps: TrailStep[] = Array.from({ length: 12 }, (_, i) => ({
      label: `Step ${i + 1}`,
      detail: `Detail for step ${i + 1}`,
      timestamp: `2026-07-31T10:00:0${i % 10}.000Z`,
    }));

    renderConsole({ status: "Running", trail: steps });

    expect(container?.textContent).toContain("Showing latest 8 of 12 steps");
    expect(container?.textContent).not.toContain("Step 1:");
    expect(container?.textContent).toContain("Step 5:");
    expect(container?.textContent).toContain("Step 12:");
  });

  it("renders accessible section with list role", () => {
    const steps: TrailStep[] = [
      {
        label: "Worker started",
        detail: "Initiated execution.",
        timestamp: "2026-07-31T10:00:00.000Z",
      },
    ];
    renderConsole({ status: "Completed", trail: steps });

    const section = container?.querySelector("section");
    expect(section?.getAttribute("aria-label")).toBe("Run Activity Console");

    const list = container?.querySelector("ol");
    expect(list?.getAttribute("role")).toBe("list");
  });

  it("handles malformed trail items gracefully without crashing", () => {
    const malformedTrail = [
      null,
      undefined,
      "invalid-string-step",
      { label: "Valid Step", detail: "Valid Detail", timestamp: "2026-07-31T10:00:00.000Z" },
      { broken: true },
    ] as unknown as TrailStep[];

    renderConsole({ status: "Completed", trail: malformedTrail });
    expect(container?.textContent).toContain("Valid Step:");
    expect(container?.textContent).toContain("Valid Detail");
  });
});
