import type { CheckSeverity, CheckStatus } from "@/lib/helios/shared/types";

import {
  DOM_LOAD_SLOW_MS,
  DOM_LOAD_WARNING_MS,
} from "@/lib/helios/shared/constants";
import { formatDurationMs } from "@/lib/helios/shared/format";

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
