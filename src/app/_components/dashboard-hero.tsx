"use client";

import { Database, Cpu } from "lucide-react";

type DashboardHeroProps = {
  isRunActive?: boolean;
  isDbConnected?: boolean | null;
};

export function DashboardHero({
  isRunActive = false,
  isDbConnected = true,
}: DashboardHeroProps) {
  const systemStatus = isRunActive
    ? {
        label: "Executing QA Check",
        color: "border-accent/40 bg-accent/10 text-accent",
        dot: "bg-accent",
      }
    : isDbConnected === false
      ? {
          label: "System Degraded",
          color: "border-danger/40 bg-danger/10 text-danger",
          dot: "bg-danger",
        }
      : {
          label: "System Operational",
          color: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500",
          dot: "bg-emerald-500",
        };

  const dbStatusText =
    isDbConnected === null
      ? "Connecting..."
      : isDbConnected === false
        ? "Offline"
        : "Connected";

  const workerStatusText = isRunActive ? "Executing Check..." : "Ready";

  return (
    <header className="mb-6 rounded-xl border border-border/80 bg-gradient-to-r from-panel/90 via-panel/70 to-card/60 px-6 py-5 shadow-xs">
      <div className="flex flex-wrap items-center gap-2 mb-2.5">
        {/* Dynamic Main Operational Badge */}
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition ${systemStatus.color}`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full animate-pulse ${systemStatus.dot}`}
          />
          {systemStatus.label}
        </span>

        {/* Dynamic Database Badge */}
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/90 px-2.5 py-0.5 text-[11px] font-medium text-muted">
          <Database className="h-3 w-3 text-muted" />
          <span>PostgreSQL:</span>
          <span
            className={`font-semibold ${
              isDbConnected === false ? "text-danger" : "text-foreground"
            }`}
          >
            {dbStatusText}
          </span>
        </span>

        {/* Dynamic Playwright Worker Badge */}
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/90 px-2.5 py-0.5 text-[11px] font-medium text-muted">
          <Cpu className="h-3 w-3 text-muted" />
          <span>Playwright Worker:</span>
          <span
            className={`font-semibold ${
              isRunActive ? "text-accent" : "text-foreground"
            }`}
          >
            {workerStatusText}
          </span>
        </span>
      </div>

      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl text-foreground">
        See What Your Browser Saw
      </h1>

      <p className="mt-1.5 text-xs sm:text-sm text-muted leading-relaxed max-w-2xl">
        Execute Playwright browser checks in real time. Inspect desktop and
        mobile screenshots, console stack traces, network egress failures, and
        AI-assisted reports.
      </p>
    </header>
  );
}
