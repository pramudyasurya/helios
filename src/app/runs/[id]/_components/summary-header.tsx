import Link from "next/link";
import type { LatestRun } from "@/lib/shared/domain/types";
import { ArrowLeft, Clock, Calendar, Hash } from "lucide-react";

import { StatusBadge } from "@/app/runs/[id]/_components/status-badge";
import { ExportRunButton } from "@/app/runs/[id]/_components/export-run-button";
import { formatDurationMs, formatTimestamp } from "@/lib/shared/domain/format";
import { HELIOS_ROUTES } from "@/lib/shared/domain/routes";

type RunSummaryHeaderProps = {
  run: LatestRun;
};

export function RunSummaryHeader({ run }: RunSummaryHeaderProps) {
  const isFinished = run.status === "Completed" || run.status === "Failed";
  const displayTitle = run.title ?? run.startingUrl;

  return (
    <div className="mb-6 rounded-xl border border-border/80 bg-linear-to-r from-panel/90 via-panel/70 to-card/60 p-5 sm:p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3 mb-4">
        <Link
          href={HELIOS_ROUTES.dashboard}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-foreground transition rounded-md border border-border/60 bg-card px-2.5 py-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to dashboard
        </Link>

        <div className="flex items-center gap-2">
          <StatusBadge status={run.status} />
          {isFinished && <ExportRunButton run={run} />}
        </div>
      </div>

      <div className="mb-4">
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground break-all">
          {displayTitle}
        </h1>
        {run.title && (
          <p className="mt-1 text-xs sm:text-sm text-muted font-mono break-all">
            {run.startingUrl}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted border-t border-border/60 pt-3">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-muted" />
          <span>Started:</span>
          <span className="font-medium text-foreground">
            {formatTimestamp(run.createdAt)}
          </span>
        </div>

        {run.durationMs !== undefined && (
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-muted" />
            <span>Duration:</span>
            <span className="font-semibold text-foreground font-mono">
              {formatDurationMs(run.durationMs)}
            </span>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <Hash className="h-3.5 w-3.5 text-muted" />
          <span>ID:</span>
          <span className="font-mono text-[11px] text-muted">{run.id}</span>
        </div>
      </div>
    </div>
  );
}
