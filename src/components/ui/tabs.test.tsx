import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { Tabs, type TabItem } from "@/components/ui/tabs";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const tabs: TabItem[] = [
  { id: "overview", label: "Overview", content: "Overview content" },
  { id: "evidence", label: "Evidence", content: "Evidence content" },
  { id: "trail", label: "Trail", content: "Trail content" },
];

let root: Root | undefined;
let container: HTMLDivElement | undefined;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
});

function renderTabs() {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);

  act(() => {
    root?.render(<Tabs tabs={tabs} />);
  });

  return Array.from(
    container.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
  );
}

function pressKey(element: HTMLButtonElement, key: string) {
  act(() => {
    element.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  });
}

describe("Tabs", () => {
  it("uses roving focus and supports Arrow, Home, and End navigation", () => {
    const tabButtons = renderTabs();

    expect(tabButtons[0].tabIndex).toBe(0);
    expect(tabButtons[1].tabIndex).toBe(-1);

    tabButtons[0].focus();
    pressKey(tabButtons[0], "ArrowRight");

    expect(document.activeElement).toBe(tabButtons[1]);
    expect(tabButtons[1].getAttribute("aria-selected")).toBe("true");

    pressKey(tabButtons[1], "End");
    expect(document.activeElement).toBe(tabButtons[2]);

    pressKey(tabButtons[2], "ArrowRight");
    expect(document.activeElement).toBe(tabButtons[0]);

    pressKey(tabButtons[0], "Home");
    expect(document.activeElement).toBe(tabButtons[0]);
  });
});
