import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { ScheduledBadge } from "@/components/features/scheduled-badge";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
let container: HTMLDivElement | undefined;

function renderBadge() {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => {
    root?.render(<ScheduledBadge />);
  });
  return container;
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
});

describe("ScheduledBadge", () => {
  it("renders a labeled scheduled badge", () => {
    const el = renderBadge();
    expect(el.textContent).toContain("Scheduled");
    expect(el.querySelector("svg")).not.toBeNull();
  });
});
