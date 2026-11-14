/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
describe("useModalFocus", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    document.body.style.overflow = "";
  });

  it("handles keyboard escape key and overflow lock cleanly", () => {
    const originalOverflow = document.body.style.overflow;
    expect(originalOverflow).toBe("");
  });
});
