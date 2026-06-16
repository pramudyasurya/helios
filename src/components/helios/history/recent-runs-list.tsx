import type { LatestRun } from "@/lib/helios/shared/types";
import { formatDurationMs, formatTimestamp } from "@/lib/helios/shared/format";
import { StatusBadge } from "@/components/helios/run/status-badge";

type RecentRunsListProps = {
  runs: LatestRun[];
  onSelectRun: (run: LatestRun) => void;
  onClearRuns: () => void;
};

export function RecentRunsList({
  runs,
  onSelectRun,
  onClearRuns,
}: RecentRunsListProps) {
  if (runs.length <= 0) return null;

  return (
    <section className="mt-6 rounded-lg border border-border bg-panel p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-medium text-foreground">Recent runs</h2>
        <button
          type="button"
          onClick={onClearRuns}
          className="rounded-full border border-border px-2 py-1 text-xs text-muted transition hover:text-foreground"
        >
          Clear
        </button>
      </div>

      <ul className="mt-4 space-y-3">
        {runs.map((run) => (
          <li
            key={run.id}
            className="rounded-md border border-border bg-card p-3 text-sm"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-foreground break-all">{run.startingUrl}</p>
                <p className="mt-1 text-xs text-muted">
                  {formatTimestamp(run.createdAt)}
                  {run.durationMs !== undefined
                    ? ` - ${formatDurationMs(run.durationMs)}`
                    : ""}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <StatusBadge status={run.status} />
                <button
                  type="button"
                  onClick={() => onSelectRun(run)}
                  className="rounded-full border border-border px-2 py-1 text-xs text-muted transition hover:text-foreground"
                >
                  View
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
