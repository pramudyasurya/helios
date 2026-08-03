import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { LatestRun } from "@/lib/shared/domain/types";
import { HELIOS_ROUTES } from "@/lib/shared/domain/routes";
import { normalizeRunStatus } from "@/lib/shared/domain/format";

import { RunSummaryCard } from "@/app/runs/[id]/_components/run-summary-card";
import { RunMetricsGrid } from "@/app/runs/[id]/_components/run-metrics-grid";
import { StatusBadge } from "@/app/runs/[id]/_components/status-badge";
import { RunActivityConsole } from "@/components/features/run-activity-console";
import { downloadRunJson } from "@/lib/client/export";

type LatestRunPanelProps = {
  latestRun: LatestRun | null;
  onReset: () => void;
};

export function LatestRunPanel({ latestRun, onReset }: LatestRunPanelProps) {
  const normalizedStatus = normalizeRunStatus(latestRun?.status);
  const isActive =
    normalizedStatus === "Running" || normalizedStatus === "Queued";
  const isFailed = normalizedStatus === "Failed";
  const canExport =
    normalizedStatus === "Completed" || normalizedStatus === "Failed";
  const trailLength = Array.isArray(latestRun?.trail)
    ? latestRun.trail.length
    : 0;

  const announcementText = isActive
    ? `QA run in progress: status ${normalizedStatus}`
    : latestRun
      ? `QA run finished with status ${normalizedStatus}`
      : "";

  const failureStep = isFailed
    ? latestRun?.trail
        ?.slice()
        .reverse()
        .find(
          (step) =>
            step.label.toLowerCase().includes("failed") ||
            step.detail.toLowerCase().includes("failed"),
        )
    : undefined;

  const failureReason = isFailed
    ? failureStep
      ? `${failureStep.label}: ${failureStep.detail}`
      : latestRun?.summary &&
        !latestRun.summary.toLowerCase().includes("no agent summary")
        ? latestRun.summary
        : "Browser check failed before completing all verification milestones."
    : null;

  return (
    <section className="rounded-xs border border-border/80 bg-panel/90 p-5 shadow-sm">
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcementText}
      </div>

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">Latest Run</h2>
          {latestRun?.projectName || latestRun?.environmentName ? (
            <span className="inline-flex items-center gap-1 rounded-xs border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-400">
              {latestRun.projectName ? `${latestRun.projectName} / ` : ""}
              {latestRun.environmentName}
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={latestRun?.status ?? "Idle"} />
          {latestRun ? (
            <>
              <button
                type="button"
                onClick={() => {
                  if (!canExport) return;
                  downloadRunJson(latestRun);
                }}
                disabled={!canExport}
                className="rounded-xs border border-border px-2.5 py-1 text-xs text-muted transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              >
                Export JSON
              </button>
              {canExport ? (
                <Link
                  href={HELIOS_ROUTES.runDetail(latestRun.id)}
                  className="rounded-xs border border-border px-2.5 py-1 text-xs text-muted transition hover:text-foreground"
                >
                  View run
                </Link>
              ) : null}
              <button
                type="button"
                onClick={onReset}
                className="rounded-xs border border-border px-2.5 py-1 text-xs text-muted transition hover:text-foreground cursor-pointer"
              >
                Reset
              </button>
            </>
          ) : null}
        </div>
      </header>

      <div className="mt-4">
        {latestRun ? (
          <div className="space-y-6">
            {isFailed ? (
              <div
                role="alert"
                aria-label="Run Failure Reason"
                className="rounded-xs border border-danger/40 bg-danger/10 p-4"
              >
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-danger">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Failure Reason</span>
                </div>
                <p className="mt-1.5 text-sm font-medium text-foreground/90 leading-relaxed">
                  {failureReason}
                </p>
              </div>
            ) : (
              <RunSummaryCard summary={latestRun.summary} />
            )}

            <RunMetricsGrid run={latestRun} />

            {/* Live activity for active runs */}
            {isActive && (
              <div className="mt-4">
                <RunActivityConsole
                  status={latestRun.status}
                  trail={latestRun.trail}
                />
              </div>
            )}

            {/* Collapsible diagnostic trail disclosure for completed or failed runs */}
            {!isActive && trailLength > 0 && (
              <details className="group rounded-xs border border-border/60 bg-card/40 p-4">
                <summary className="flex cursor-pointer items-center justify-between font-medium text-xs text-muted hover:text-foreground select-none">
                  <span>Execution Activity Log ({trailLength} steps)</span>
                  <span className="text-[11px] text-muted group-open:hidden">
                    Show activity details
                  </span>
                  <span className="text-[11px] text-muted hidden group-open:inline">
                    Hide activity details
                  </span>
                </summary>
                <div className="mt-3">
                  <RunActivityConsole
                    status={latestRun.status}
                    trail={latestRun.trail}
                  />
                </div>
              </details>
            )}
          </div>
        ) : (
          <div className="rounded-xs border border-dashed border-border/70 bg-card/60 p-4 text-center sm:text-left">
            <p className="text-sm font-medium text-foreground">
              No QA runs yet
            </p>
            <p className="mt-1 text-xs sm:text-sm text-muted">
              Submit a URL above to create your first browser QA run.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
