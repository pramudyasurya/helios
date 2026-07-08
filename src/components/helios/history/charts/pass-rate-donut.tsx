"use client";

import React from "react";
import { PieChart, Pie, ResponsiveContainer } from "recharts";
import { ChartErrorBoundary } from "./chart-error-boundary";

interface PassRateDonutProps {
  passRate: number;
}

function PassRateDonutInner({ passRate }: PassRateDonutProps) {
  const COLORS = ["var(--success)", "var(--border)"];
  const data = [
    {
      name: "Passed",
      value: passRate,
      fill: COLORS[0],
    },
    {
      name: "Failed",
      value: 100 - passRate,
      fill: COLORS[1],
    },
  ];

  return (
    <div
      role="img"
      aria-label={`Donut chart showing ${passRate}% pass rate`}
      className="relative h-12 w-12 shrink-0"
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={14}
            outerRadius={18}
            paddingAngle={0}
            dataKey="value"
            startAngle={90}
            endAngle={-270}
            stroke="var(--panel)"
            strokeWidth={1}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-[9px] font-semibold text-foreground">
          {passRate}%
        </span>
      </div>
    </div>
  );
}

export function PassRateDonut(props: PassRateDonutProps) {
  return (
    <ChartErrorBoundary
      fallback={
        <div className="h-12 w-12 border border-border rounded-full flex items-center justify-center text-[9px] text-muted">
          Err
        </div>
      }
    >
      <PassRateDonutInner {...props} />
    </ChartErrorBoundary>
  );
}
