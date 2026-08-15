"use client";

import React from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrendPoint } from "@/lib/shared/domain/types";
import { ChartErrorBoundary } from "./chart-error-boundary";

interface TrendLineChartProps {
  data: TrendPoint[];
}

type TrendTooltipPayload = {
  dataKey?: string | number;
  name?: string | number;
  value?: number | string;
  color?: string;
};

type TrendTooltipProps = {
  active?: boolean;
  label?: string | number;
  payload?: TrendTooltipPayload[];
};

function formatDateLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function TrendTooltip({ active, label, payload }: TrendTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-xs border border-border/80 bg-panel/95 px-3 py-2 shadow-xs">
      <p className="text-[11px] font-mono text-muted">
        {formatDateLabel(String(label ?? ""))}
      </p>
      <div className="mt-1 space-y-0.5">
        {payload.map((entry) => (
          <p
            key={String(entry.dataKey)}
            className="text-xs font-mono"
            style={{ color: entry.color }}
          >
            {entry.name}:{" "}
            {entry.dataKey === "passRate"
              ? `${Number(entry.value)}%`
              : Number(entry.value)}
          </p>
        ))}
      </div>
    </div>
  );
}

function TrendLineChartInner({ data }: TrendLineChartProps) {
  const ariaLabel = `Line chart showing pass rate and console error count across the last ${data.length} terminal runs`;

  return (
    <div>
      <div className="mb-2 flex items-center justify-end gap-4 text-[11px] font-mono text-muted">
        <span className="flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-full bg-[#10b981]"
            aria-hidden="true"
          />
          Pass rate
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: "var(--danger)" }}
            aria-hidden="true"
          />
          Console errors
        </span>
      </div>
      <div role="img" aria-label={ariaLabel} className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%" aria-hidden="true">
          <LineChart
            data={data}
            margin={{ top: 8, right: 4, left: 4, bottom: 0 }}
          >
            <CartesianGrid
              stroke="var(--border)"
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tickFormatter={formatDateLabel}
              tick={{ fill: "var(--muted)", fontSize: 11 }}
              stroke="var(--border)"
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              minTickGap={28}
              dy={4}
            />
            <YAxis
              yAxisId="passRate"
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
              tick={{ fill: "var(--muted)", fontSize: 11 }}
              stroke="var(--border)"
              tickLine={false}
              width={40}
            />
            <YAxis
              yAxisId="errorCount"
              orientation="right"
              allowDecimals={false}
              tick={{ fill: "var(--muted)", fontSize: 11 }}
              stroke="var(--border)"
              tickLine={false}
              width={32}
            />
            <Tooltip
              content={<TrendTooltip />}
              cursor={{ stroke: "var(--muted)", strokeDasharray: "3 3" }}
            />
            <Line
              yAxisId="passRate"
              type="monotone"
              dataKey="passRate"
              name="Pass rate"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 2, fill: "#10b981", strokeWidth: 0 }}
              activeDot={{ r: 4 }}
            />
            <Line
              yAxisId="errorCount"
              type="monotone"
              dataKey="errorCount"
              name="Console errors"
              stroke="var(--danger)"
              strokeWidth={2}
              dot={{ r: 2, fill: "var(--danger)", strokeWidth: 0 }}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function TrendLineChart(props: TrendLineChartProps) {
  return (
    <ChartErrorBoundary
      fallback={
        <div className="flex h-56 w-full items-center justify-center rounded-xs border border-border text-xs text-muted">
          Chart Error
        </div>
      }
    >
      <TrendLineChartInner {...props} />
    </ChartErrorBoundary>
  );
}
