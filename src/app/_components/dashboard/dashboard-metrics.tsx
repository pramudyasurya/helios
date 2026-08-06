import dynamic from "next/dynamic";
import { RunStats } from "@/lib/shared/domain/types";
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

const EMPTY_RUN_STATS: Required<RunStats> = {
  totalRuns: 0,
  completedRuns: 0,
  failedRuns: 0,
  avgDurationMs: 0,
  recentDurations: [],
};

type MetricCardProps = {
  title: string;
  value: React.ReactNode;
  icon: LucideIcon;
  unit?: string;
  subValue?: React.ReactNode;
  chart?: React.ReactNode;
};

const PassRateDonut = dynamic(
  () =>
    import("@/app/_components/charts/pass-rate-donut").then(
      (mod) => mod.PassRateDonut,
    ),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-12 w-12 rounded-full bg-border/50 animate-pulse shrink-0"
        aria-hidden="true"
      />
    ),
  },
);

const DurationSparkLine = dynamic(
  () =>
    import("@/app/_components/charts/duration-sparkline").then(
      (mod) => mod.DurationSparkline,
    ),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-8 w-20 rounded bg-border/50 animate-pulse shrink-0"
        aria-hidden="true"
      />
    ),
  },
);

function MetricCard({
  title,
  value,
  icon: Icon,
  unit,
  subValue,
  chart,
}: MetricCardProps) {
  return (
    <div className="rounded-xs border border-border/80 bg-panel/90 p-4 transition hover:bg-card/40 shadow-xs">
      <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-muted">
        <Icon className="h-3.5 w-3.5 text-muted shrink-0" />
        <span className="truncate">{title}</span>
      </div>
      <div className="mt-2.5 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline whitespace-nowrap">
            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
              {value}
            </span>
            {unit && (
              <span className="ml-1 text-xs font-mono text-muted">
                {unit}
              </span>
            )}
          </div>
          {subValue && (
            <p className="mt-1 text-[11px] font-mono text-muted truncate">
              {subValue}
            </p>
          )}
        </div>
        {chart && <div className="shrink-0 min-w-fit self-center">{chart}</div>}
      </div>
    </div>
  );
}

export function DashboardMetrics({ stats, isLoading }: DashboardMetricsProps) {
  if (isLoading) {
    return (
      <section
        className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4"
        aria-busy="true"
        aria-label="Loading dashboard metrics"
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-xs border border-border/80 bg-panel/90 p-4"
          />
        ))}
      </section>
    );
  }

  const safeStats: Required<RunStats> = {
    ...EMPTY_RUN_STATS,
    ...stats,
    recentDurations: stats?.recentDurations ?? EMPTY_RUN_STATS.recentDurations,
  };

  const completedOrFailed = safeStats.completedRuns + safeStats.failedRuns;
  const passRate =
    completedOrFailed > 0
      ? Math.round((safeStats.completedRuns / completedOrFailed) * 100)
      : 0;

  return (
    <section
      className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4"
      aria-label="Dashboard metrics"
    >
      <MetricCard
        title="Total Runs"
        value={safeStats.totalRuns}
        icon={Activity}
      />

      <MetricCard
        title="Pass Rate"
        value={completedOrFailed > 0 ? `${passRate}%` : "-"}
        icon={CheckCircle}
        subValue={
          completedOrFailed > 0
            ? `${safeStats.completedRuns} passed`
            : undefined
        }
        chart={
          completedOrFailed > 0 ? <PassRateDonut passRate={passRate} /> : null
        }
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
            ? (safeStats.avgDurationMs / 1000).toFixed(2)
            : "-"
        }
        unit={safeStats.avgDurationMs > 0 ? "s" : undefined}
        icon={Clock}
        chart={
          safeStats.totalRuns > 1 && safeStats.recentDurations.length > 1 ? (
            <DurationSparkLine recentDurations={safeStats.recentDurations} />
          ) : null
        }
      />
    </section>
  );
}
