import type { LatestRun } from "@/lib/shared/domain/types";
import {
  Activity,
  AlertCircle,
  Clock,
  ListChecks,
  Network,
} from "lucide-react";
import { formatDurationMs } from "@/lib/shared/domain/format";
import { getFindingsFromChecks } from "@/lib/shared/domain/findings";
import { formatDomLoadMetric } from "@/lib/shared/domain/performance";

type RunMetricsGridProps = {
  run: LatestRun;
};

export function RunMetricsGrid({ run }: RunMetricsGridProps) {
  const consoleErrorCount = run.consoleErrors?.length ?? 0;
  const failedRequestCount = run.failedRequests?.length ?? 0;
  const findingCount = getFindingsFromChecks(run.checks).length;
  const metrics = [
    {
      label: "Duration",
      value:
        run.durationMs !== undefined ? formatDurationMs(run.durationMs) : "-",
      icon: Clock,
      color: "text-muted",
    },
    {
      label: "DOM Content Loaded",
      value: run.loadMetrics
        ? formatDomLoadMetric(run.loadMetrics.domContentLoadedMs)
        : "-",
      icon: Activity,
      color: "text-muted",
    },
    {
      label: "Findings",
      value: findingCount,
      icon: ListChecks,
      color: findingCount > 0 ? "text-accent font-bold" : "text-muted/70",
    },
    {
      label: "Console Errors",
      value: consoleErrorCount,
      icon: AlertCircle,
      color: consoleErrorCount > 0 ? "text-danger font-bold" : "text-muted/70",
    },
    {
      label: "Failed Requests",
      value: failedRequestCount,
      icon: Network,
      color: failedRequestCount > 0 ? "text-danger font-bold" : "text-muted/70",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
      {metrics.map((m) => (
        <div
          key={m.label}
          className="rounded-xs border border-border/80 bg-card/80 p-3.5 flex flex-col justify-between min-h-22 shadow-2xs transition hover:border-accent/40"
        >
          <div className="flex items-center gap-1.5 text-muted mb-2">
            <m.icon className={`w-3.5 h-3.5 shrink-0 ${m.color}`} />
            <span
              className="text-[11px] font-semibold uppercase tracking-wider text-muted truncate"
              title={m.label}
            >
              {m.label}
            </span>
          </div>
          <span className="text-xl font-semibold tracking-tight text-foreground mt-auto">
            {m.value}
          </span>
        </div>
      ))}
    </div>
  );
}
