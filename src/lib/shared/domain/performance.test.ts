import { describe, expect, it } from "vitest";
import {
  getDomLoadStatus,
  formatDomLoadMetric,
} from "@/lib/shared/domain/performance";

describe("getDomLoadStatus", () => {
  it("marks fast loads as passed", () => {
    const status = getDomLoadStatus(800);

    expect(status).toMatchObject({
      status: "passed",
      severity: "info",
    });
  });

  it("marks moderate loads as warning", () => {
    const status = getDomLoadStatus(3000);

    expect(status).toMatchObject({
      status: "warning",
      severity: "low",
    });
  });

  it("marks slow loads as warning", () => {
    const status = getDomLoadStatus(6000);

    expect(status).toMatchObject({
      status: "warning",
      severity: "medium",
    });
  });
});

describe("formatDomLoadMetric", () => {
  it("formats the duration with the load label", () => {
    const metric = formatDomLoadMetric(400);

    expect(metric).toBe("0.40 s (Fast)");
  });
});
