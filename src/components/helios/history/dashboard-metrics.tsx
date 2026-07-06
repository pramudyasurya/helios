import { formatDurationMs } from "@/lib/helios/shared/format";
import { RunStats } from "@/lib/helios/shared/types";
import {
  Activity,
  CheckCircle,
  Clock,
  LucideIcon,
  XCircle,
} from "lucide-react";
import React from "react";

type DashboardMetricsProps = {
  stats: RunStats | null;
  isLoading: boolean;
};

type MetricCardProps = {
  title: string;
  value: React.ReactNode;
  icon: LucideIcon;
  subValue?: React.ReactNode;
};

function MetricCard({ title, value, icon: Icon, subValue }: MetricCardProps) {
  return (
    <div className="rounded-lg border border-border bg-panel p-5">
      <div className="flex items-center gap-2 text-sm font-medium text-muted">
        <Icon className="h-4 w-4" />
        {title}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-semibold tracking-tight text-foreground">
          {value}
        </span>
        {subValue && <span className="text-sm text-muted">{subValue}</span>}
      </div>
    </div>
  );
}

export function DashboardMetrics({ stats, isLoading }: DashboardMetricsProps) {
  if (isLoading) {
    return (
      <section
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        aria-busy="true"
        aria-label="Loading dashboard metrics"
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-lg border border-border bg-panel p-5"
          />
        ))}
      </section>
    );
  }

  const safeStats = stats || {
    totalRuns: 0,
    completedRuns: 0,
    failedRuns: 0,
    avgDurationMs: 0,
  };

  const completedOrFailed = safeStats.completedRuns + safeStats.failedRuns;
  const passRate =
    completedOrFailed > 0
      ? Math.round((safeStats.completedRuns / completedOrFailed) * 100)
      : 0;

  return (
    <section
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      aria-label="Dashboard metrics"
    >
      <MetricCard
        title="Total Runs"
        value={safeStats.totalRuns}
        icon={Activity}
      />

      <MetricCard
        title="Pass Rate"
        value={`${passRate}%`}
        icon={CheckCircle}
        subValue={`(${safeStats.completedRuns} passed)`}
      />

      <MetricCard
        title="Failed Runs"
        value={safeStats.failedRuns}
        icon={XCircle}
      />

      <MetricCard
        title="Avg Duration"
        value={
          safeStats.avgDurationMs > 0
            ? formatDurationMs(safeStats.avgDurationMs)
            : "-"
        }
        icon={Clock}
      />
    </section>
  );
}
