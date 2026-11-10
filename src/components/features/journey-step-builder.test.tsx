import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { JourneyStepBuilder } from "./journey-step-builder";
import type { JourneyStep } from "@/lib/shared/domain/journey";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
let container: HTMLDivElement | undefined;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
});

describe("JourneyStepBuilder", () => {
  it("renders empty state message when steps array is empty", () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root?.render(<JourneyStepBuilder steps={[]} onChange={vi.fn()} />);
    });

    expect(container.textContent).toContain("No steps configured yet.");
  });

  it("renders steps and triggers onChange on Add Step", () => {
    const onChange = vi.fn();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root?.render(<JourneyStepBuilder steps={[]} onChange={onChange} />);
    });

    const addButton = container.querySelector("button");
    expect(addButton).not.toBeNull();
    expect(addButton?.textContent).toContain("Add Step");

    act(() => {
      addButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    const addedSteps = onChange.mock.calls[0][0];
    expect(addedSteps).toHaveLength(1);
    expect(addedSteps[0].action).toBe("waitForSelector");
  });

  it("triggers onChange on remove step", () => {
    const onChange = vi.fn();
    const initialSteps: JourneyStep[] = [
      { id: "s1", action: "click", selector: "#btn" },
      { id: "s2", action: "assertVisible", selector: ".banner" },
    ];

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root?.render(
        <JourneyStepBuilder steps={initialSteps} onChange={onChange} />,
      );
    });

    const removeBtn = container.querySelector(
      'button[aria-label="Remove step 1"]',
    );
    expect(removeBtn).not.toBeNull();

    act(() => {
      removeBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    const remaining = onChange.mock.calls[0][0];
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe("s2");
  });
});
