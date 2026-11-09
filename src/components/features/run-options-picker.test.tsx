import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RunOptionsPicker } from "./run-options-picker";

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

describe("RunOptionsPicker", () => {
  it("renders all four execution modes including Synthetic Journey", () => {
    const handleChange = vi.fn();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root?.render(<RunOptionsPicker onChange={handleChange} />);
    });

    expect(container.textContent).toContain("Single Page");
    expect(container.textContent).toContain("Auto Crawl");
    expect(container.textContent).toContain("Manual Routes");
    expect(container.textContent).toContain("Synthetic Journey");
  });

  it("switches to Synthetic Journey mode and allows editing steps JSON", () => {
    const handleChange = vi.fn();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root?.render(<RunOptionsPicker onChange={handleChange} />);
    });

    const journeyButton = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.includes("Synthetic Journey"),
    );
    expect(journeyButton).toBeDefined();

    act(() => {
      journeyButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).toContain("Declarative Step Sequence (JSON DSL)");
    const textarea = container.querySelector("textarea#journey-steps") as HTMLTextAreaElement;
    expect(textarea).toBeDefined();
    expect(textarea.value).toContain("waitForSelector");

    act(() => {
      textarea.value = JSON.stringify([
        { id: "step-1", action: "goto", url: "https://example.com" },
      ]);
      textarea.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "journey",
      }),
    );
  });
});
