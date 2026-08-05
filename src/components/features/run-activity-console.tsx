"use client";

import type { TrailStep } from "@/lib/shared/domain/types";
import { normalizeRunStatus } from "@/lib/shared/domain/format";

export type RunActivityConsoleProps = {
  status?: string;
  trail?: TrailStep[];
  className?: string;
};

function formatStepTime(timestamp?: string): string {
  if (!timestamp) return "--:--:--";
  try {
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return "--:--:--";
    return d.toLocaleTimeString([], {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "--:--:--";
  }
}

export function RunActivityConsole({
  status,
  trail,
  className = "",
}: RunActivityConsoleProps) {
  const normalizedStatus = normalizeRunStatus(status);
  const isActive =
    normalizedStatus === "Running" || normalizedStatus === "Queued";
  const isFailed = normalizedStatus === "Failed";
  const rawSteps = Array.isArray(trail) ? trail : [];
  const steps = rawSteps.filter(
    (step): step is TrailStep =>
      Boolean(step) &&
      typeof step === "object" &&
      typeof step.label === "string" &&
      typeof step.detail === "string",
  );
  const displaySteps = steps.slice(-8);

  return (
    <section
      aria-label="Run Activity Console"
      className={`rounded-xs border border-border/80 bg-panel/90 p-5 shadow-sm ${className}`}
    >
      <div className="mb-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">
            Run Activity Log
          </h2>
          {isActive && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Live
            </span>
          )}
        </div>
        <span className="text-[11px] font-medium text-muted">
          {steps.length > 0
            ? `Showing latest ${displaySteps.length} of ${steps.length} steps`
            : "No activity milestones"}
        </span>
      </div>

      {displaySteps.length === 0 ? (
        <div className="py-6 text-center text-xs text-muted font-mono bg-zinc-950/40 rounded-xs border border-border/40">
          {isActive
            ? "Waiting for live activity milestones..."
            : "No activity recorded yet for the latest run."}
        </div>
      ) : (
        <ol
          role="list"
          className="space-y-1.5 max-h-56 overflow-y-auto font-mono text-xs bg-zinc-950/40 p-3 rounded-xs border border-border/40"
        >
          {displaySteps.map((step, idx) => {
            const isLast = idx === displaySteps.length - 1;
            const isStepFailed =
              step.label.toLowerCase().includes("failed") ||
              step.detail.toLowerCase().includes("failed");

            let badgeColor = "text-muted-foreground";
            if (isStepFailed || (isLast && isFailed)) {
              badgeColor = "text-red-400 font-semibold";
            } else if (isLast && isActive) {
              badgeColor = "text-amber-400 font-semibold";
            } else if (isLast && normalizedStatus === "Completed") {
              badgeColor = "text-emerald-400 font-semibold";
            }

            return (
              <li
                key={`${step.timestamp}-${idx}`}
                className="flex items-start gap-2.5 py-1 border-b border-border/20 last:border-0"
              >
                <time
                  dateTime={step.timestamp}
                  className="text-[11px] text-muted shrink-0 select-none pt-0.5"
                >
                  {formatStepTime(step.timestamp)}
                </time>
                <div className="min-w-0 flex-1 flex flex-wrap items-baseline gap-x-2">
                  <span className={`shrink-0 ${badgeColor}`}>
                    {step.label}:
                  </span>
                  <span className="text-foreground/90 wrap-break-word">
                    {step.detail}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
