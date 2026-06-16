import { StatusBadge } from "@/components/helios/run/status-badge";
import { OverviewCard } from "@/components/helios/run/overview-card";
import {
  getOverviewCardDescription,
  getOverviewCards,
} from "@/lib/helios/shared/overview-cards";

import type { LatestRun } from "@/lib/helios/shared/types";
import { RunChecksList } from "@/components/helios/run/run-checks-list";
import { BrowserTrail } from "@/components/helios/run/browser-trail";
import { RunMetadata } from "@/components/helios/run/run-metadata";
import { RunEvidenceList } from "@/components/helios/evidence/run-evidence-list";
import { downloadRunJson } from "@/lib/helios/client/export";

type LatestRunPanelProps = {
  latestRun: LatestRun | null;
  onReset: () => void;
};

export function LatestRunPanel({ latestRun, onReset }: LatestRunPanelProps) {
  const overviewCards = getOverviewCards(latestRun);
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

      <div className="mt-4 text-sm text-muted">
        {latestRun ? (
          <RunMetadata run={latestRun} />
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

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {overviewCards.map((card) => (
          <OverviewCard
            key={card.title}
            title={card.title}
            description={getOverviewCardDescription(latestRun, card)}
          />
        ))}
      </div>
      {latestRun ? (
        <RunEvidenceList
          brokenImages={latestRun.brokenImages}
          consoleErrors={latestRun.consoleErrors}
          failedRequests={latestRun.failedRequests}
        />
      ) : null}

      {latestRun ? <RunChecksList checks={latestRun.checks} /> : null}
      {latestRun ? <BrowserTrail trail={latestRun.trail} /> : null}
    </section>
  );
}
