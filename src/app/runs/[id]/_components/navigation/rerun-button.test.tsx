import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LatestRun } from "@/lib/shared/domain/types";
import { RerunButton } from "./rerun-button";
import * as api from "@/lib/client/api";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let root: Root | undefined;
let container: HTMLDivElement | undefined;

const sampleRun: LatestRun = {
  id: "run-sample-123",
  startingUrl: "https://example.com/start",
  status: "Completed",
  summary: "Sample summary",
  trail: [],
  checks: [],
  createdAt: "2026-09-17T00:00:00.000Z",
  mode: "crawl",
  maxDepth: 1,
  maxPages: 3,
  projectId: "proj-123",
  environmentId: "env-456",
};

function renderComponent(run: LatestRun = sampleRun) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);

  act(() => {
    root?.render(<RerunButton run={run} />);
  });
}

describe("RerunButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    root = undefined;
    container = undefined;
  });

  it("renders the re-run button with proper label and icon", () => {
    renderComponent();
    const button = container?.querySelector("button");
    expect(button).not.toBeNull();
    expect(button?.textContent).toContain("Re-run");
    expect(button?.getAttribute("aria-label")).toBe("Re-run QA check");
    expect(button?.getAttribute("title")).toBe("Re-run this QA check");
  });

  it("calls POST /api/runs via createRun and redirects to new run detail on success", async () => {
    const createRunSpy = vi.spyOn(api, "createRun").mockResolvedValueOnce({
      id: "run-new-999",
      status: "queued",
    });

    renderComponent();
    const button = container?.querySelector("button");

    await act(async () => {
      button?.click();
    });

    expect(createRunSpy).toHaveBeenCalledTimes(1);
    expect(createRunSpy).toHaveBeenCalledWith({
      url: "https://example.com/start",
      mode: "crawl",
      maxDepth: 1,
      maxPages: 3,
      projectId: "proj-123",
      environmentId: "env-456",
      origin: "manual",
    });

    expect(pushMock).toHaveBeenCalledTimes(1);
    expect(pushMock).toHaveBeenCalledWith("/runs/run-new-999");
  });

  it("displays error message when createRun rejects", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(api, "createRun").mockRejectedValueOnce({
      message: "Failed to queue run: Database busy",
    });

    renderComponent();
    const button = container?.querySelector("button");

    await act(async () => {
      button?.click();
    });

    expect(pushMock).not.toHaveBeenCalled();
    const alert = container?.querySelector("[role='alert']");
    expect(alert).not.toBeNull();
    expect(alert?.textContent).toContain("Failed to queue run: Database busy");
  });
});
