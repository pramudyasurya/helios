import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExportRunButton } from "./export-run-button";
import type { LatestRun } from "@/lib/shared/domain/types";

const mockExport = vi.hoisted(() => ({
  downloadRunJson: vi.fn(),
  downloadRunHtml: vi.fn(),
}));

vi.mock("@/lib/client/export", () => ({
  downloadRunJson: mockExport.downloadRunJson,
  downloadRunHtml: mockExport.downloadRunHtml,
}));

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
  vi.clearAllMocks();
});

describe("ExportRunButton", () => {
  const mockRun = {
    id: "run-export-btn-1",
    startingUrl: "https://example.com",
    finalUrl: "https://example.com",
    status: "Completed",
    summary: "Success",
    checks: [],
    trail: [],
    createdAt: new Date().toISOString(),
  } as unknown as LatestRun;

  it("opens the dropdown menu and triggers JSON export", () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root?.render(<ExportRunButton run={mockRun} />);
    });

    const trigger = container.querySelector("button");
    expect(trigger?.textContent).toContain("Export");

    act(() => {
      trigger?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).toContain("JSON Payload");
    expect(container.textContent).toContain("Standalone HTML");

    const jsonButton = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.includes("JSON Payload"),
    );

    act(() => {
      jsonButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(mockExport.downloadRunJson).toHaveBeenCalledWith(mockRun);
  });

  it("triggers HTML report export on Standalone HTML click", () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root?.render(<ExportRunButton run={mockRun} />);
    });

    const trigger = container.querySelector("button");
    act(() => {
      trigger?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const htmlButton = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.includes("Standalone HTML"),
    );

    act(() => {
      htmlButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(mockExport.downloadRunHtml).toHaveBeenCalledWith("run-export-btn-1");
  });
});
