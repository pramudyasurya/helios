import type { LatestRun } from "@/lib/helios/shared/types";
import {
  Activity,
  AlertCircle,
  Clock,
  ListChecks,
  Network,
} from "lucide-react";
import { formatDurationMs } from "@/lib/helios/shared/format";
import { getFindingsFromChecks } from "@/lib/helios/shared/findings";
import { formatDomLoadMetric } from "@/lib/helios/shared/performance";

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
      color: "text-accent",
    },
    {
      label: "Findings",
      value: findingCount,
      icon: ListChecks,
      color: findingCount > 0 ? "text-accent" : "text-green-500",
    },
    {
      label: "Console Errors",
      value: consoleErrorCount,
      icon: AlertCircle,
      color: consoleErrorCount > 0 ? "text-yellow-500" : "text-green-500",
    },
    {
      label: "Failed Requests",
      value: failedRequestCount,
      icon: Network,
      color: failedRequestCount > 0 ? "text-yellow-500" : "text-green-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
      {metrics.map((m) => (
        <div
          key={m.label}
          className="bg-card border border-border rounded-lg p-4 flex flex-col"
        >
          <div className="flex items-center gap-2 mb-2 text-muted">
            <m.icon className={`w-4 h-4 ${m.color}`} />
            <span className="text-xs font-medium uppercase tracking-wider">
              {m.label}
            </span>
          </div>
          <span className="text-xl font-semibold text-foreground">
            {m.value}
          </span>
        </div>
      ))}
    </div>
  );
}
