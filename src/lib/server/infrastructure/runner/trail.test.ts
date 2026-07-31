const prismaMock = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/lib/server/infrastructure/db/prisma", () => ({
  prisma: {
    run: {
      findUnique: prismaMock.findUnique,
      update: prismaMock.update,
    },
  },
}));

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getRunTimestamp,
  createTrailStep,
  boundTrailSteps,
  appendRunTrailStep,
  createTerminalRunTrailStep,
  getTerminalRunOutcome,
  formatDisplayUrl,
  redactEmbeddedUrls,
} from "@/lib/server/infrastructure/runner/trail";

afterEach(() => {
  vi.useRealTimers();
  prismaMock.findUnique.mockReset();
  prismaMock.update.mockReset();
});

describe("getRunTimestamp", () => {
  it("adds an offset to the start time", () => {
    const startedAt = new Date("2026-06-24T10:00:00.000Z");

    expect(getRunTimestamp(startedAt, 1000)).toBe("2026-06-24T10:00:01.000Z");
  });
});

describe("formatDisplayUrl and redactEmbeddedUrls", () => {
  it("redacts credentials, query params, and fragments from direct URLs", () => {
    const raw = "https://user:pass@example.com/page?token=secret#section";
    expect(formatDisplayUrl(raw)).toBe("https://example.com/page");
  });

  it("redacts embedded URLs inside sentence error text", () => {
    const text =
      "Navigation failed to https://user:token@api.example.com/v1/run?secret=abc#top while checking target.";
    expect(redactEmbeddedUrls(text)).toBe(
      "Navigation failed to https://api.example.com/v1/run while checking target.",
    );
  });

  it("redacts every valid embedded URL while leaving malformed text readable", () => {
    const text =
      "Failed https://alice:secret@one.example/a?token=one#top; then https://two.example/b?q=two#bottom; malformed https://.";

    expect(redactEmbeddedUrls(text)).toBe(
      "Failed https://one.example/a; then https://two.example/b; malformed https://.",
    );
  });
});

describe("createTerminalRunTrailStep", () => {
  it.each([
    ["Completed", "Run completed"],
    ["Failed", "Run failed"],
  ] as const)("uses %s status to label the terminal event %s", (status, label) => {
    expect(
      createTerminalRunTrailStep({
        status,
        summary: "Terminal summary",
        timestamp: "2026-07-31T10:00:05.000Z",
      }),
    ).toEqual({
      label,
      detail: "Terminal summary",
      timestamp: "2026-07-31T10:00:05.000Z",
    });
  });
});

describe("getTerminalRunOutcome", () => {
  it.each([
    [2, 0, "Completed", "Helios completed QA for 2 page(s)."],
    [2, 1, "Completed", "Helios completed QA for 2 page(s) with 1 failed page(s)."],
    [2, 2, "Failed", "Helios could not complete QA for any of 2 page(s)."],
  ] as const)(
    "reports %s pages with %s failures as %s",
    (totalPages, failedPages, status, summary) => {
      expect(getTerminalRunOutcome({ totalPages, failedPages })).toEqual({
        status,
        summary,
      });
    },
  );
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

describe("boundTrailSteps", () => {
  it("leaves steps untouched if under max limit", () => {
    const steps = [
      createTrailStep({ label: "First", detail: "Detail 1" }),
      createTrailStep({ label: "Second", detail: "Detail 2" }),
    ];
    expect(boundTrailSteps(steps, 5)).toEqual(steps);
  });

  it("retains the first step and the latest max-1 steps when exceeding max limit", () => {
    const steps = Array.from({ length: 10 }, (_, i) =>
      createTrailStep({ label: `Step ${i + 1}`, detail: `Detail ${i + 1}` }),
    );

    const bounded = boundTrailSteps(steps, 4);
    expect(bounded).toHaveLength(4);
    expect(bounded[0].label).toBe("Step 1");
    expect(bounded[1].label).toBe("Step 8");
    expect(bounded[2].label).toBe("Step 9");
    expect(bounded[3].label).toBe("Step 10");
  });

  it("filters out malformed trail items before bounding", () => {
    const steps = [
      createTrailStep({ label: "Step 1", detail: "Detail 1" }),
      null,
      "invalid",
      createTrailStep({ label: "Step 2", detail: "Detail 2" }),
    ] as unknown as import("@/lib/shared/domain/types").TrailStep[];

    const clean = boundTrailSteps(steps, 5);
    expect(clean).toHaveLength(2);
    expect(clean[0].label).toBe("Step 1");
    expect(clean[1].label).toBe("Step 2");
  });
});

describe("appendRunTrailStep", () => {
  it("fetches existing trail, appends step, and updates database", async () => {
    prismaMock.findUnique.mockResolvedValueOnce({
      trail: [
        {
          label: "Step 1",
          detail: "Detail 1",
          timestamp: "2026-07-31T10:00:00.000Z",
        },
      ],
    });
    prismaMock.update.mockResolvedValueOnce({});

    const trail = await appendRunTrailStep({
      runId: "run-123",
      step: { label: "Step 2", detail: "Detail 2" },
    });

    expect(prismaMock.findUnique).toHaveBeenCalledWith({
      where: { id: "run-123" },
      select: { trail: true },
    });
    expect(prismaMock.update).toHaveBeenCalledOnce();
    expect(trail).toHaveLength(2);
    expect(trail[1].label).toBe("Step 2");
  });

  it("propagates database persistence errors so workers detect failure", async () => {
    prismaMock.findUnique.mockRejectedValueOnce(
      new Error("Database connection lost"),
    );

    await expect(
      appendRunTrailStep({
        runId: "run-123",
        step: { label: "Worker started", detail: "Testing error" },
      }),
    ).rejects.toThrow("Database connection lost");
  });
});
