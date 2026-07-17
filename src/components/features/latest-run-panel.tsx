import Link from "next/link";
import type { LatestRun } from "@/lib/shared/domain/types";
import { HELIOS_ROUTES } from "@/lib/shared/domain/routes";

import { RunSummaryCard } from "@/app/runs/[id]/_components/run-summary-card";
import { RunMetricsGrid } from "@/app/runs/[id]/_components/run-metrics-grid";
import { StatusBadge } from "@/app/runs/[id]/_components/status-badge";
import { downloadRunJson } from "@/lib/client/export";

type LatestRunPanelProps = {
  latestRun: LatestRun | null;
  onReset: () => void;
};

export function LatestRunPanel({ latestRun, onReset }: LatestRunPanelProps) {
  const canExport =
    latestRun?.status === "Completed" || latestRun?.status === "Failed";

  return (
    <section className="mt-6 rounded-lg border border-border bg-panel p-5">
      <header className="text-base font-medium flex items-center justify-between">
        <h2>Latest run</h2>
        <div className="flex items-center gap-2">
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
                className="rounded-full border border-border px-2 py-1 text-xs text-muted transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                Export JSON
              </button>
              {canExport ? (
                <Link
                  href={HELIOS_ROUTES.runDetail(latestRun.id)}
                  className="rounded-full border border-border px-2 py-1 text-xs text-muted transition hover:text-foreground"
                >
                  View run
                </Link>
              ) : null}
              <button
                type="button"
                onClick={onReset}
                className="rounded-full border border-border px-2 py-1 text-xs text-muted transition hover:text-foreground"
              >
                Reset
              </button>
            </>
          ) : null}
        </div>
      </header>

      <div className="mt-6">
        {latestRun ? (
          <div className="space-y-6">
            <RunSummaryCard summary={latestRun.summary} />
            <RunMetricsGrid run={latestRun} />
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-border bg-card p-4">
            <p className="text-sm font-medium text-foreground">
              No QA runs yet
            </p>
            <p className="mt-1 text-sm text-muted">
              Submit a URL above to create your first browser QA run.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
