import { useRunHistory } from "@/lib/client/use-run-dashboard";
import { useEffect, type RefObject } from "react";
import { DashboardMetrics } from "@/components/features/dashboard-metrics";
import { RunSearchBar } from "@/app/_components/run-search-bar";
import { RecentRunsSkeleton } from "@/app/_components/recent-runs-skeleton";
import { RecentRunsList } from "@/components/features/recent-runs-list";

type RunHistorySectionProps = {
  refreshTrigger: number;
  searchInputRef?: RefObject<HTMLInputElement | null>;
  onDatabaseConnectionChange?: (isConnected: boolean | null) => void;
};

export function RunHistorySection({
  refreshTrigger,
  searchInputRef,
  onDatabaseConnectionChange,
}: RunHistorySectionProps) {
  const {
    recentRuns,
    isHistoryLoading,
    historyError,
    stats,
    isStatsLoading,
    searchQuery,
    statusFilter,
    currentPage,
    totalPages,
    handleSearch,
    handleStatusChange,
    handlePageChange,
    handleClearRecentRuns,
    handleDeleteRun,
  } = useRunHistory(refreshTrigger);

  const isDbConnected = isHistoryLoading ? null : !historyError;

  useEffect(() => {
    onDatabaseConnectionChange?.(isDbConnected);
  }, [isDbConnected, onDatabaseConnectionChange]);

  return (
    <div className="space-y-6">
      <section
        aria-label="Observability Metrics Section"
        className="rounded-xs border border-border/80 bg-panel/90 p-5 shadow-sm"
      >
        <div className="mb-3.5 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            Observability Metrics
          </h2>
          <span className="text-[11px] font-medium text-muted">
            Retrospective Summary
          </span>
        </div>
        <DashboardMetrics stats={stats} isLoading={isStatsLoading} />
      </section>

      <div className="rounded-xs border border-border/80 bg-panel/90 p-5 sm:p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between border-b border-border/60 pb-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Run History
            </h2>
            <p className="text-xs text-muted">
              Search, filter, and inspect past QA runs and evidence reports.
            </p>
          </div>
          <span className="hidden sm:inline-flex items-center rounded-xs border border-border/60 bg-card px-2.5 py-0.5 text-[11px] font-mono text-muted">
            {recentRuns.length} runs loaded
          </span>
        </div>

        <RunSearchBar
          initialQuery={searchQuery}
          initialStatus={statusFilter}
          onSearch={handleSearch}
          onStatusChange={handleStatusChange}
          searchInputRef={searchInputRef}
        />

        <div className="mt-4">
          {isHistoryLoading ? (
            <RecentRunsSkeleton />
          ) : historyError ? (
            <p className="text-sm text-muted">{historyError}</p>
          ) : (
            <RecentRunsList
              runs={recentRuns}
              meta={{ page: currentPage, totalPages }}
              hasFilters={searchQuery !== "" || statusFilter !== "All"}
              onPageChange={handlePageChange}
              onClearRuns={handleClearRecentRuns}
              onDeleteRun={handleDeleteRun}
            />
          )}
        </div>
      </div>
    </div>
  );
}
