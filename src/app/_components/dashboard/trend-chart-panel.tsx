import dynamic from "next/dynamic";
import type { RunStats } from "@/lib/shared/domain/types";

type TrendChartPanelProps = {
  stats: RunStats | null;
};

const TrendLineChart = dynamic(
  () =>
    import("@/app/_components/charts/trend-line-chart").then(
      (mod) => mod.TrendLineChart,
    ),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-56 w-full animate-pulse rounded-xs bg-border/50"
        aria-hidden="true"
      />
    ),
  },
);

export function TrendChartPanel({ stats }: TrendChartPanelProps) {
  if (stats === null) {
    return (
      <div
        className="rounded-xs border border-border/80 bg-panel/90 p-4 shadow-xs"
        aria-busy="true"
        aria-label="Loading run trends"
      >
        <div className="mb-3 h-4 w-44 animate-pulse rounded bg-border/50" />
        <div className="h-56 w-full animate-pulse rounded-xs bg-border/50" />
      </div>
    );
  }

  const timeseries = stats.timeseries ?? [];

  return (
    <div className="rounded-xs border border-border/80 bg-panel/90 p-4 shadow-xs">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">
          Pass rate &amp; error trends
        </h3>
        {timeseries.length >= 2 && (
          <span className="text-[11px] font-mono text-muted">
            Last {timeseries.length} runs
          </span>
        )}
      </div>
      {timeseries.length >= 2 ? (
        <TrendLineChart data={timeseries} />
      ) : (
        <p
          role="status"
          className="rounded-xs border border-dashed border-border/80 bg-card/30 px-3 py-6 text-center text-xs text-muted"
        >
          Run checks over time to see trends
        </p>
      )}
    </div>
  );
}
