import { afterEach, describe, expect, it, vi } from "vitest";
import { getRunTimestamp, createTrailStep } from "@/lib/server/infrastructure/runner/trail";

afterEach(() => {
  vi.useRealTimers();
});

describe("getRunTimestamp", () => {
  it("adds an offset to the start time", () => {
    const startedAt = new Date("2026-06-24T10:00:00.000Z");

    expect(getRunTimestamp(startedAt, 1000)).toBe("2026-06-24T10:00:01.000Z");
  });
});

describe("createTrailStep", () => {
  it("uses the provided timestamp", () => {
    const step = createTrailStep({
      label: "Page loaded",
      detail: "The page reached a loaded state.",
      timestamp: "2026-06-24T10:00:02.000Z",
    });

    expect(step).toMatchObject({
      label: "Page loaded",
      detail: "The page reached a loaded state.",
      timestamp: "2026-06-24T10:00:02.000Z",
    });
  });

  it("uses the current time when timestamp is omitted", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-24T10:00:03.000Z"));

    const step = createTrailStep({
      label: "Queued",
      detail: "Waiting to launch.",
    });

    expect(step.timestamp).toBe("2024-06-24T10:00:03.000Z");
  });
});
