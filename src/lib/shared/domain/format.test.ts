import { describe, expect, it } from "vitest";
import {
  formatDurationMs,
  formatLabel,
  normalizeRunStatus,
} from "@/lib/shared/domain/format";

describe("formatDurationMs", () => {
  it("formats milliseconds as seconds with two decimals", () => {
    expect(formatDurationMs(1500)).toBe("1.50 s");
  });
});

describe("formatLabel", () => {
  it("capitalizes underscore-separated words", () => {
    expect(formatLabel("failed_network")).toBe("Failed Network");
  });
});

describe("normalizeRunStatus", () => {
  it("normalizes case and surrounding whitespace to valid RunStatus", () => {
    expect(normalizeRunStatus("running")).toBe("Running");
    expect(normalizeRunStatus("  QUEUED  ")).toBe("Queued");
    expect(normalizeRunStatus("COMPLETED")).toBe("Completed");
    expect(normalizeRunStatus("failed")).toBe("Failed");
    expect(normalizeRunStatus("idle")).toBe("Idle");
  });

  it("returns Idle for missing, empty, or unknown status strings", () => {
    expect(normalizeRunStatus(undefined)).toBe("Idle");
    expect(normalizeRunStatus("")).toBe("Idle");
    expect(normalizeRunStatus("unknown_status")).toBe("Idle");
  });
});
