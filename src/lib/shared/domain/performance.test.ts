import { describe, expect, it } from "vitest";
import {
  getDomLoadStatus,
  formatDomLoadMetric,
  evaluateCoreWebVitals,
  evaluateResourceBudgets,
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

describe("evaluateCoreWebVitals", () => {
  it("returns empty array if no CWV metrics are present", () => {
    const result = evaluateCoreWebVitals({
      domContentLoadedMs: 400,
      loadEventMs: 800,
    });
    expect(result).toHaveLength(0);
  });

  it("evaluates all Good vitals as passed with info severity", () => {
    const result = evaluateCoreWebVitals({
      domContentLoadedMs: 400,
      loadEventMs: 800,
      lcpMs: 1200,
      cls: 0.05,
      ttfbMs: 200,
      fcpMs: 600,
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      title: "Core Web Vitals checked",
      status: "passed",
      severity: "info",
    });
    expect(result[0].detail).toContain("LCP: 1200ms (Good)");
    expect(result[0].detail).toContain("CLS: 0.05 (Good)");
    expect(result[0].detail).toContain("TTFB: 200ms (Good)");
    expect(result[0].detail).toContain("FCP: 600ms (Good)");
  });

  it("evaluates Needs Improvement vitals as warning with medium severity", () => {
    const result = evaluateCoreWebVitals({
      domContentLoadedMs: 400,
      loadEventMs: 800,
      lcpMs: 2800,
      cls: 0.05,
      ttfbMs: 200,
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      title: "Core Web Vitals checked",
      status: "warning",
      severity: "medium",
    });
    expect(result[0].detail).toContain("LCP: 2800ms (Needs Improvement)");
  });

  it("evaluates Poor LCP as failed with high severity", () => {
    const result = evaluateCoreWebVitals({
      domContentLoadedMs: 400,
      loadEventMs: 800,
      lcpMs: 4500,
      cls: 0.05,
      ttfbMs: 200,
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      title: "Core Web Vitals checked",
      status: "failed",
      severity: "high",
    });
    expect(result[0].detail).toContain("LCP: 4500ms (Poor)");
  });

  it("evaluates Poor CLS as failed with high severity", () => {
    const result = evaluateCoreWebVitals({
      domContentLoadedMs: 400,
      loadEventMs: 800,
      lcpMs: 1200,
      cls: 0.35,
      ttfbMs: 200,
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      title: "Core Web Vitals checked",
      status: "failed",
      severity: "high",
    });
    expect(result[0].detail).toContain("CLS: 0.35 (Poor)");
  });
});

describe("evaluateResourceBudgets", () => {
  it("returns empty array when resources is undefined", () => {
    expect(evaluateResourceBudgets(undefined)).toHaveLength(0);
  });

  it("passes when resources are within budgets", () => {
    const result = evaluateResourceBudgets({
      jsBytes: 500_000,
      cssBytes: 80_000,
      imageBytes: 600_000,
      fontBytes: 50_000,
      totalTransferBytes: 1_230_000,
      resourceCount: 42,
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      title: "Resource transfer budgets checked",
      status: "passed",
      severity: "info",
    });
    expect(result[0].detail).toContain("Transferred 1.2 MB across 42 requests");
  });

  it("warns when JS exceeds 2 MB budget", () => {
    const result = evaluateResourceBudgets({
      jsBytes: 3_000_000,
      cssBytes: 80_000,
      imageBytes: 600_000,
      fontBytes: 50_000,
      totalTransferBytes: 3_730_000,
      resourceCount: 50,
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      title: "Resource transfer budgets checked",
      status: "warning",
      severity: "medium",
    });
    expect(result[0].detail).toContain("JS transfer 2.9 MB exceeds 2 MB budget");
  });

  it("warns when total transfer exceeds 5 MB budget", () => {
    const result = evaluateResourceBudgets({
      jsBytes: 1_000_000,
      cssBytes: 80_000,
      imageBytes: 5_000_000,
      fontBytes: 50_000,
      totalTransferBytes: 6_130_000,
      resourceCount: 80,
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      title: "Resource transfer budgets checked",
      status: "warning",
      severity: "medium",
    });
    expect(result[0].detail).toContain("Total page transfer 5.8 MB exceeds 5 MB budget");
  });
});
