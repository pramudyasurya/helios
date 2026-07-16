"use client";

import { useId } from "react";
import { ResponsiveContainer, AreaChart, Area } from "recharts";
import { ChartErrorBoundary } from "./chart-error-boundary";

interface DurationSparklineProps {
  recentDurations: number[];
}

function DurationSparklineInner({ recentDurations }: DurationSparklineProps) {
  const id = useId();
  const gradientId = `sparklineGradient-${id}`;

  const data = recentDurations.map((duration, index) => ({
    index,
    duration,
  }));

  return (
    <div
      role="img"
      aria-label={`Sparkline showing recent run durations: ${recentDurations.join(",")}`}
      className="h-8 w-20 shrink-0"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 2, right: 2, left: 2, bottom: 2 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type={"monotone"}
            dataKey={"duration"}
            stroke="var(--accent)"
            strokeWidth={1.5}
            fillOpacity={1}
            fill={`url(#${gradientId})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DurationSparkline(props: DurationSparklineProps) {
  return (
    <ChartErrorBoundary
      fallback={
        <div className="h-8 w-20 border border-border rounded flex items-center justify-center text-[9px] text-muted">
          Err
        </div>
      }
    >
      <DurationSparklineInner {...props} />
    </ChartErrorBoundary>
  );
}
