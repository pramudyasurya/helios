import type {
  CheckResult,
  CheckSeverity,
  CheckStatus,
  LoadMetrics,
  ResourceBudgets,
} from "@/lib/shared/domain/types";

import {
  DOM_LOAD_SLOW_MS,
  DOM_LOAD_WARNING_MS,
} from "@/lib/shared/domain/constants";
import { formatBytes, formatDurationMs } from "@/lib/shared/domain/format";

export const CWV_THRESHOLDS = {
  LCP_GOOD_MS: 2500,
  LCP_POOR_MS: 4000,
  CLS_GOOD: 0.1,
  CLS_POOR: 0.25,
  TTFB_GOOD_MS: 800,
  TTFB_POOR_MS: 1800,
  FCP_GOOD_MS: 1800,
  FCP_POOR_MS: 3000,
  MAX_JS_BYTES: 2 * 1024 * 1024, // 2 MB
  MAX_TOTAL_BYTES: 5 * 1024 * 1024, // 5 MB
} as const;

type PerformanceStatus = {
  label: string;
  status: CheckStatus;
  severity: CheckSeverity;
};

export function getDomLoadStatus(
  domContentLoadedMs: number,
): PerformanceStatus {
  if (domContentLoadedMs >= DOM_LOAD_SLOW_MS) {
    return {
      label: "Slow",
      status: "warning",
      severity: "medium",
    };
  }

  if (domContentLoadedMs >= DOM_LOAD_WARNING_MS) {
    return {
      label: "Moderate",
      status: "warning",
      severity: "low",
    };
  }

  return {
    label: "Fast",
    status: "passed",
    severity: "info",
  };
}

export function formatDomLoadMetric(domContentLoadedMs: number) {
  const domLoadStatus = getDomLoadStatus(domContentLoadedMs);

  return `${formatDurationMs(domContentLoadedMs)} (${domLoadStatus.label})`;
}

export function evaluateCoreWebVitals(metrics: LoadMetrics): CheckResult[] {
  const hasCwv =
    metrics.lcpMs !== undefined ||
    metrics.cls !== undefined ||
    metrics.ttfbMs !== undefined ||
    metrics.fcpMs !== undefined;

  if (!hasCwv) return [];

  let worstStatus: CheckStatus = "passed";
  let worstSeverity: CheckSeverity = "info";

  const recordRating = (
    label: string,
    value: string,
    status: "Good" | "Needs Improvement" | "Poor",
  ) => {
    parts.push(`${label}: ${value} (${status})`);
    if (status === "Poor") {
      worstStatus = "failed";
      worstSeverity = "high";
    } else if (status === "Needs Improvement" && worstStatus !== "failed") {
      worstStatus = "warning";
      worstSeverity = "medium";
    }
  };
  const parts: string[] = [];

  // 1. LCP
  if (metrics.lcpMs !== undefined) {
    const rating =
      metrics.lcpMs > CWV_THRESHOLDS.LCP_POOR_MS
        ? "Poor"
        : metrics.lcpMs > CWV_THRESHOLDS.LCP_GOOD_MS
          ? "Needs Improvement"
          : "Good";
    recordRating("LCP", `${metrics.lcpMs}ms`, rating);
  }

  // 2. CLS
  if (metrics.cls !== undefined) {
    const rating =
      metrics.cls > CWV_THRESHOLDS.CLS_POOR
        ? "Poor"
        : metrics.cls > CWV_THRESHOLDS.CLS_GOOD
          ? "Needs Improvement"
          : "Good";
    recordRating("CLS", `${metrics.cls}`, rating);
  }

  // 3. TTFB
  if (metrics.ttfbMs !== undefined) {
    const rating =
      metrics.ttfbMs > CWV_THRESHOLDS.TTFB_POOR_MS
        ? "Poor"
        : metrics.ttfbMs > CWV_THRESHOLDS.TTFB_GOOD_MS
          ? "Needs Improvement"
          : "Good";
    recordRating("TTFB", `${metrics.ttfbMs}ms`, rating);
  }

  // 4. FCP
  if (metrics.fcpMs !== undefined) {
    const rating =
      metrics.fcpMs > CWV_THRESHOLDS.FCP_POOR_MS
        ? "Poor"
        : metrics.fcpMs > CWV_THRESHOLDS.FCP_GOOD_MS
          ? "Needs Improvement"
          : "Good";
    recordRating("FCP", `${metrics.fcpMs}ms`, rating);
  }

  return [
    {
      title: "Core Web Vitals checked",
      status: worstStatus,
      severity: worstSeverity,
      detail: parts.join(", "),
    },
  ];
}

export function evaluateResourceBudgets(resources?: ResourceBudgets): CheckResult[] {
  if (!resources) return [];

  const breaches: string[] = [];
  if (resources.jsBytes > CWV_THRESHOLDS.MAX_JS_BYTES) {
    breaches.push(`JS transfer ${formatBytes(resources.jsBytes)} exceeds 2 MB budget`);
  }
  if (resources.totalTransferBytes > CWV_THRESHOLDS.MAX_TOTAL_BYTES) {
    breaches.push(
      `Total page transfer ${formatBytes(resources.totalTransferBytes)} exceeds 5 MB budget`,
    );
  }

  const status: CheckStatus = breaches.length > 0 ? "warning" : "passed";
  const severity: CheckSeverity = breaches.length > 0 ? "medium" : "info";
  const breakdown = `Transferred ${formatBytes(resources.totalTransferBytes)} across ${resources.resourceCount} requests (JS: ${formatBytes(resources.jsBytes)}, CSS: ${formatBytes(resources.cssBytes)}, Images: ${formatBytes(resources.imageBytes)}, Fonts: ${formatBytes(resources.fontBytes)})`;
  const detail = breaches.length > 0 ? `${breaches.join("; ")}. ${breakdown}` : breakdown;

  return [
    {
      title: "Resource transfer budgets checked",
      status,
      severity,
      detail,
    },
  ];
}
