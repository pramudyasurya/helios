"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { RunStats } from "@/lib/shared/domain/types";
import type { TrendMetricMode } from "@/app/_components/charts/trend-line-chart";

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
  const [metricMode, setMetricMode] = useState<TrendMetricMode>("quality");
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
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-foreground">
            {metricMode === "performance"
              ? "Core Web Vitals trends"
              : "Pass rate & error trends"}
          </h3>
          {timeseries.length >= 2 && (
            <span className="text-[11px] font-mono text-muted">
              ({timeseries.length} runs)
            </span>
          )}
        </div>
        <div className="flex items-center rounded-xs border border-border/80 bg-card/60 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setMetricMode("quality")}
            className={`rounded-xs px-2 py-0.5 font-medium transition-colors cursor-pointer ${
              metricMode === "quality"
                ? "bg-foreground/10 text-foreground"
                : "text-muted hover:text-foreground"
            }`}
          >
            Quality
          </button>
          <button
            type="button"
            onClick={() => setMetricMode("performance")}
            className={`rounded-xs px-2 py-0.5 font-medium transition-colors cursor-pointer ${
              metricMode === "performance"
                ? "bg-foreground/10 text-foreground"
                : "text-muted hover:text-foreground"
            }`}
          >
            CWV
          </button>
        </div>
      </div>
      {timeseries.length >= 2 ? (
        <TrendLineChart data={timeseries} metricMode={metricMode} />
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
