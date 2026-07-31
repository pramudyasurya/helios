// @vitest-environment jsdom
import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const apiMocks = vi.hoisted(() => ({
  createRun: vi.fn(),
  getRunDetail: vi.fn(),
}));

vi.mock("@/lib/client/api", () => ({
  createRun: apiMocks.createRun,
  getRunDetail: apiMocks.getRunDetail,
  getRuns: vi.fn(),
  getRunStats: vi.fn(),
  clearRecentRuns: vi.fn(),
  deleteRun: vi.fn(),
}));

import { useRunDashboard } from "@/lib/client/use-run-dashboard";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
let container: HTMLDivElement | undefined;
let hookResult: ReturnType<typeof useRunDashboard> | undefined;

function TestComponent({ onComplete }: { onComplete?: () => void }) {
  const res = useRunDashboard(onComplete);
  useEffect(() => {
    hookResult = res;
  }, [res]);
  return null;
}

function renderHook(onComplete?: () => void) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);

  act(() => {
    root?.render(<TestComponent onComplete={onComplete} />);
  });
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
  hookResult = undefined;
  apiMocks.createRun.mockReset();
  apiMocks.getRunDetail.mockReset();
  vi.useRealTimers();
});

describe("useRunDashboard active polling resilience", () => {
  it("polls active runs, preserves state on transient error, and stops on terminal status", async () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();

    apiMocks.createRun.mockResolvedValueOnce({ id: "run-101" });
    apiMocks.getRunDetail
      .mockResolvedValueOnce({
        id: "run-101",
        status: "Running",
        trail: [{ label: "Worker started", detail: "Started", timestamp: "2026-07-31T10:00:00.000Z" }],
      })
      .mockRejectedValueOnce(new Error("Transient network timeout"))
      .mockResolvedValueOnce({
        id: "run-101",
        status: "Completed",
        trail: [
          { label: "Worker started", detail: "Started", timestamp: "2026-07-31T10:00:00.000Z" },
          { label: "Run completed", detail: "Done", timestamp: "2026-07-31T10:00:05.000Z" },
        ],
      });

    renderHook(onComplete);

    await act(async () => {
      await hookResult?.handleSubmit("https://example.com");
    });

    // Submit run initializes active state and triggers initial poll (Running)
    expect(hookResult?.isRunActive).toBe(true);
    expect(hookResult?.latestRun?.id).toBe("run-101");
    expect(hookResult?.latestRun?.status).toBe("Running");

    // Interval poll 1 (Transient error -> preserves last good Running state)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(hookResult?.latestRun?.status).toBe("Running");
    expect(hookResult?.latestRun?.trail).toHaveLength(1);

    // Interval poll 2 (Completed -> updates state and calls onComplete)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(hookResult?.latestRun?.status).toBe("Completed");
    expect(hookResult?.latestRun?.trail).toHaveLength(2);
    expect(onComplete).toHaveBeenCalled();
  });

  it("does not overlap a pending poll and accepts the following terminal result", async () => {
    vi.useFakeTimers();
    let resolveFirstPoll: ((run: { id: string; status: "Running"; trail: [] }) => void) | undefined;
    const firstPoll = new Promise<{ id: string; status: "Running"; trail: [] }>((resolve) => {
      resolveFirstPoll = resolve;
    });

    apiMocks.createRun.mockResolvedValueOnce({ id: "run-102" });
    apiMocks.getRunDetail
      .mockReturnValueOnce(firstPoll)
      .mockResolvedValueOnce({ id: "run-102", status: "Completed", trail: [] });

    renderHook();
    await act(async () => {
      await hookResult?.handleSubmit("https://example.com");
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6_000);
    });
    expect(apiMocks.getRunDetail).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveFirstPoll?.({ id: "run-102", status: "Running", trail: [] });
      await Promise.resolve();
    });
    expect(hookResult?.latestRun?.status).toBe("Running");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });
    expect(apiMocks.getRunDetail).toHaveBeenCalledTimes(2);
    expect(hookResult?.latestRun?.status).toBe("Completed");
  });
});
