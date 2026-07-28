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

  it("formats multi-step trail array properly for QA runs", () => {
    const startedAt = new Date("2026-07-28T10:00:00.000Z");
    const steps = [
      createTrailStep({
        label: "Run queued",
        detail: "Helios queued a crawl browser QA run.",
        timestamp: startedAt.toISOString(),
      }),
      createTrailStep({
        label: "Browser launched",
        detail: "Playwright launched a Chromium browser instance.",
        timestamp: getRunTimestamp(startedAt, 250),
      }),
      createTrailStep({
        label: "Inspected page (Depth 0)",
        detail: "Evaluated https://example.com with status Completed (200).",
        timestamp: getRunTimestamp(startedAt, 1500),
      }),
      createTrailStep({
        label: "Run completed",
        detail: "Helios completed QA for 1 page(s).",
        timestamp: getRunTimestamp(startedAt, 2000),
      }),
    ];

    expect(steps).toHaveLength(4);
    expect(steps[0].label).toBe("Run queued");
    expect(steps[1].label).toBe("Browser launched");
    expect(steps[2].label).toBe("Inspected page (Depth 0)");
    expect(steps[3].label).toBe("Run completed");
  });
});
