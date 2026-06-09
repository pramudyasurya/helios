import { StatusBadge } from "@/components/helios/status-badge";
import { OverviewCard } from "@/components/helios/overview-card";
import { overviewCards } from "@/lib/helios/overview-cards";

import type { LatestRun, OverviewCardData } from "@/lib/helios/types";

type LatestRunPanelProps = {
  latestRun: LatestRun | null;
  onReset: () => void;
};

export function LatestRunPanel({ latestRun, onReset }: LatestRunPanelProps) {
  const getCardDescription = (card: OverviewCardData) => {
    if (!latestRun) return card.emptyText;
    if (latestRun.status === "Completed") return card.completedText;
    return card.activeText;
  };

  return (
    <section className="mt-6 rounded-lg border border-border bg-panel p-5">
      <header className="text-base font-medium flex items-center justify-between">
        <h2>Latest run</h2>
        <div className="flex items-center gap-2">
          <StatusBadge status={latestRun?.status ?? "Idle"} />
          {latestRun ? (
            <button
              onClick={onReset}
              className="rounded-full border border-border px-2 py-1 text-xs text-muted hover:text-foreground"
            >
              Reset
            </button>
          ) : null}
        </div>
      </header>
      <div className="mt-4 text-sm text-muted">
        {latestRun ? (
          <div className="space-y-3 text-sm grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted">Run ID</p>
              <p className="text-foreground break-all">{latestRun.id}</p>
            </div>

            <div>
              <p className="text-sm text-muted">Queued at</p>
              <p className="text-foreground break-all">{latestRun.createdAt}</p>
            </div>

            <div>
              <p className="text-sm text-muted">Starting URL</p>
              <p className="text-foreground break-all">
                {latestRun.startingUrl}
              </p>
            </div>
          </div>
        ) : (
          "No runs yet"
        )}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {overviewCards.map((card) => (
          <OverviewCard
            key={card.title}
            title={card.title}
            description={getCardDescription(card)}
          />
        ))}
      </div>

      {latestRun ? (
        <div className="mt-5 border-t border-border pt-4">
          <h3 className="text-sm font-medium text-foreground">Browser trail</h3>
          <div className="mt-3 max-h-64 overflow-y-auto rounded-md border border-border bg-background p-3">
            <ol className="space-y-3 text-sm">
              {latestRun.trail.map((step, index) => (
                <li
                  key={`${step.label}-${index}`}
                  className="border-b border-border pb-3 last:border-b-0 last:pb-0"
                >
                  <p className="text-foreground">{step.label}</p>
                  <p className="text-muted">{step.detail}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      ) : null}
    </section>
  );
}
