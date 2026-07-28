"use client";

import {
  Terminal,
  ShieldCheck,
  Activity,
  AlertTriangle,
} from "lucide-react";

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
        icon: Activity,
        iconColor: "text-accent animate-pulse",
      }
    : isDbConnected === false
      ? {
          label: "System Degraded",
          icon: AlertTriangle,
          iconColor: "text-danger",
        }
      : {
          label: "System Operational",
          icon: ShieldCheck,
          iconColor: "text-muted/80",
        };

  const StatusIcon = systemStatus.icon;

  const dbStatusText =
    isDbConnected === null
      ? "Connecting..."
      : isDbConnected === false
        ? "Offline"
        : "Connected";

  const workerStatusText =
    isDbConnected === false
      ? "Offline (DB Disconnected)"
      : isRunActive
        ? "Executing Check..."
        : "Ready";

  return (
    <header className="mb-6 rounded-xl border border-border/80 bg-linear-to-r from-panel/90 via-panel/70 to-card/60 px-6 py-5 sm:py-6 shadow-xs">
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl text-foreground">
        See What Your Browser Saw
      </h1>

      <p className="mt-1.5 text-xs sm:text-sm text-muted leading-relaxed max-w-2xl">
        Execute Playwright browser checks in real time. Inspect desktop and
        mobile screenshots, console stack traces, network egress failures, and
        AI-assisted reports.
      </p>

      {/* CLI Status Log Snippet */}
      <div className="mt-4 inline-flex flex-col sm:flex-row sm:items-center gap-2 rounded-lg border border-border/80 bg-background/90 px-3.5 py-2 font-mono text-[11px] text-muted shadow-2xs">
        <div className="flex items-center gap-2 shrink-0 text-muted/70">
          <Terminal className="h-3.5 w-3.5 text-accent" />
          <span className="text-foreground font-semibold">
            $ helios status --live
          </span>
        </div>
        <span className="hidden sm:inline text-border/80" aria-hidden="true">
          │
        </span>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex items-center gap-1.5">
            <StatusIcon className={`h-3 w-3 ${systemStatus.iconColor}`} />
            <span className="text-foreground">{systemStatus.label}</span>
          </span>
          <span className="text-muted/40">·</span>
          <span>
            postgres:{" "}
            <span
              className={
                isDbConnected === false
                  ? "text-danger font-semibold"
                  : "text-foreground"
              }
            >
              {dbStatusText}
            </span>
          </span>
          <span className="text-muted/40">·</span>
          <span>
            worker:{" "}
            <span
              className={
                isDbConnected === false
                  ? "text-danger font-semibold"
                  : isRunActive
                    ? "text-accent font-semibold"
                    : "text-foreground"
              }
            >
              {workerStatusText}
            </span>
          </span>
        </div>
      </div>
    </header>
  );
}
