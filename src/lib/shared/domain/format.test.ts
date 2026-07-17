import { describe, expect, it } from "vitest";
import { formatDurationMs, formatLabel } from "@/lib/shared/domain/format";

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
