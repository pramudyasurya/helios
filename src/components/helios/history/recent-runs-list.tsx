import { useState } from "react";
import { EmptyState } from "../ui/empty-state";
import Link from "next/link";
import type { LatestRun } from "@/lib/helios/shared/types";
import { HELIOS_ROUTES } from "@/lib/helios/shared/routes";
import { Trash2, ChevronLeft, ChevronRight, Search } from "lucide-react";

import { formatDurationMs, formatTimestamp } from "@/lib/helios/shared/format";
import { StatusBadge } from "@/components/helios/run/status-badge";

type RecentRunsListProps = {
  runs: LatestRun[];
  meta?: {
    page: number;
    totalPages: number;
  };
  hasFilters?: boolean;
  onPageChange?: (page: number) => void;
  onClearRuns: () => Promise<void>;
  onDeleteRun: (id: string) => Promise<void>;
};

function getDomain(urlStr: string) {
  try {
    return new URL(urlStr).hostname;
  } catch {
    return urlStr;
  }
}

const PAGINATION_BUTTON_CLASS =
  "inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-muted transition hover:bg-muted hover:text-foreground disabled:opacity-50 disabled:pointer-events-none";

export function RecentRunsList({
  runs,
  meta,
  hasFilters,
  onPageChange,
  onClearRuns,
  onDeleteRun,
}: RecentRunsListProps) {
  const [confirming, setConfirming] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingInProgress, setDeletingInProgress] = useState<string | null>(
    null,
  );
  const [isClearing, setIsClearing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (runs.length <= 0) {
    if (hasFilters) {
      return (
        <EmptyState
          title="No runs found"
          description="No runs match your search query or status filter. Try clearing your search or changing the filter."
          icon={Search}
        />
      );
    }
    return null;
  }

  return (
    <section className="mt-6 rounded-lg border border-border bg-panel p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-medium text-foreground">Recent runs</h2>
        {confirming ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">Clear all runs?</span>
            <button
              type="button"
              onClick={async () => {
                setActionError(null);
                setIsClearing(true);
                try {
                  await onClearRuns();
                  setConfirming(false);
                } catch {
                  setActionError("Failed to clear history. Please try again.");
                } finally {
                  setIsClearing(false);
                }
              }}
              disabled={isClearing}
              className="rounded-full bg-danger/10 px-3 py-1 text-xs font-medium text-danger transition hover:bg-danger hover:text-background disabled:opacity-50"
            >
              {isClearing ? "Clearing..." : "Yes, clear"}
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirming(false);
                setActionError(null);
              }}
              disabled={isClearing}
              className="rounded-full border border-border px-3 py-1 text-xs text-muted transition hover:text-foreground disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setConfirming(true);
              setActionError(null);
            }}
            className="rounded-full border border-border px-3 py-1 text-xs text-muted transition hover:text-foreground"
          >
            Clear History
          </button>
        )}
      </div>

      {actionError && (
        <div
          role="alert"
          className="mb-4 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger border border-danger/20"
        >
          {actionError}
        </div>
      )}

      <ul className="flex flex-col border-t border-border mt-4">
        {runs.map((run) => (
          <li
            key={run.id}
            className="group relative border-b border-border transition-colors hover:bg-muted/30"
          >
            <Link
              href={HELIOS_ROUTES.runDetail(run.id)}
              className={`flex min-w-0 flex-col gap-3 p-3 transition-[padding] sm:flex-row sm:items-center ${
                deletingId === run.id
                  ? "pr-32 sm:pr-32"
                  : "pr-12 sm:pr-3 sm:group-hover:pr-12 sm:group-focus-within:pr-12"
              }`}
            >
              <div className="shrink-0">
                <StatusBadge status={run.status} />
              </div>

              <div className="flex min-w-0 flex-1 flex-col justify-center">
                <p className="truncate text-sm font-medium text-foreground">
                  {run.title || getDomain(run.startingUrl)}
                </p>
                <p className="truncate text-xs text-muted">
                  {run.title ? getDomain(run.startingUrl) : run.startingUrl}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-3 text-right sm:flex-col sm:items-end sm:gap-0.5">
                <span className="text-xs text-foreground">
                  {formatTimestamp(run.createdAt)}
                </span>
                {run.durationMs !== undefined && (
                  <span className="text-xs text-muted">
                    {formatDurationMs(run.durationMs)}
                  </span>
                )}
              </div>
            </Link>

            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {deletingId === run.id ? (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={async () => {
                      setActionError(null);
                      setDeletingInProgress(run.id);
                      try {
                        await onDeleteRun(run.id);
                        setDeletingId(null);
                      } catch {
                        setActionError(
                          "Failed to delete run. Please try again.",
                        );
                      } finally {
                        setDeletingInProgress(null);
                      }
                    }}
                    disabled={deletingInProgress === run.id}
                    className="rounded-md bg-danger/10 px-2 py-1 text-xs font-medium text-danger transition hover:bg-danger hover:text-background disabled:opacity-50"
                  >
                    {deletingInProgress === run.id ? "Deleting..." : "Delete"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeletingId(null);
                      setActionError(null);
                    }}
                    className="rounded-md px-2 py-1 text-xs text-muted transition hover:bg-muted hover:text-foreground disabled:opacity-50"
                    disabled={deletingInProgress === run.id}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setDeletingId(run.id);
                    setActionError(null);
                  }}
                  className="rounded-md p-1.5 text-muted opacity-100 transition hover:bg-danger/10 hover:text-danger sm:opacity-0 focus:opacity-100 sm:group-hover:opacity-100"
                  aria-label="Delete run"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {meta && meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between border-t border-border p-4">
          <p className="text-sm text-muted">
            Page{" "}
            <span className="font-medium text-foreground">{meta.page}</span> of{" "}
            <span className="font-medium text-foreground">
              {meta.totalPages}
            </span>
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange?.(meta.page - 1)}
              disabled={meta.page <= 1}
              className={PAGINATION_BUTTON_CLASS}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => onPageChange?.(meta.page + 1)}
              disabled={meta.page >= meta.totalPages}
              className={PAGINATION_BUTTON_CLASS}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
