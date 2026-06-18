import { useState } from "react";

import type { LatestRun } from "@/lib/helios/shared/types";
import { formatDurationMs, formatTimestamp } from "@/lib/helios/shared/format";
import { StatusBadge } from "@/components/helios/run/status-badge";
import Link from "next/link";

type RecentRunsListProps = {
  runs: LatestRun[];
  onClearRuns: () => Promise<void>;
  onDeleteRun: (id: string) => Promise<void>;
};

export function RecentRunsList({
  runs,
  onClearRuns,
  onDeleteRun,
}: RecentRunsListProps) {
  const [confirming, setConfirming] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingInProgress, setDeletingInProgress] = useState<string | null>(
    null,
  );

  if (runs.length <= 0) return null;

  return (
    <section className="mt-6 rounded-lg border border-border bg-panel p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-medium text-foreground">Recent runs</h2>
        {confirming ? (
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted">Clear all runs?</span>
            <button
              type="button"
              onClick={async () => {
                try {
                  await onClearRuns();
                  setConfirming(false);
                } catch {}
              }}
              className="rounded-full border border-border px-2 py-1 text-xs text-muted transition hover:text-foreground"
            >
              Yes, clear
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-full border border-border px-2 py-1 text-xs text-muted transition hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="rounded-full border border-border px-2 py-1 text-xs text-muted transition hover:text-foreground"
          >
            Clear
          </button>
        )}
      </div>

      <ul className="mt-4 space-y-3">
        {runs.map((run) => (
          <li
            key={run.id}
            className="rounded-md border border-border bg-card p-3 text-sm"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-foreground break-all">
                  {run.title ?? run.startingUrl}
                </p>
                {run.title ? (
                  <p className="mt-0.5 text-xs text-muted break-all">
                    {run.startingUrl}
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-muted">
                  {formatTimestamp(run.createdAt)}
                  {run.durationMs !== undefined
                    ? ` - ${formatDurationMs(run.durationMs)}`
                    : ""}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <StatusBadge status={run.status} />
                <Link
                  href={`/runs/${run.id}`}
                  className="rounded-full border border-border px-2 py-1 text-xs text-muted transition hover:text-foreground"
                >
                  View
                </Link>
                {deletingId === run.id ? (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted">Delete?</span>
                    <button
                      type="button"
                      onClick={async () => {
                        setDeletingInProgress(run.id);

                        try {
                          await onDeleteRun(run.id);
                          setDeletingId(null);
                        } finally {
                          setDeletingInProgress(null);
                        }
                      }}
                      disabled={deletingInProgress === run.id}
                      className="rounded-full border border-border px-2 py-1 text-xs text-muted transition hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingId(null)}
                      className="rounded-full border border-border px-2 py-1 text-xs text-muted transition hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={deletingInProgress === run.id}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDeletingId(run.id)}
                    className="rounded-full border border-border px-2 py-1 text-xs text-muted transition hover:text-foreground"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
