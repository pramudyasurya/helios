import { useRunHistory } from "@/lib/helios/client/use-run-dashboard";
import { DashboardMetrics } from "./dashboard-metrics";
import { RunSearchBar } from "./run-search-bar";
import { RecentRunsSkeleton } from "./recent-runs-skeleton";
import { RecentRunsList } from "./recent-runs-list";

type RunHistorySectionProps = {
  refreshTrigger: number;
};

export function RunHistorySection({ refreshTrigger }: RunHistorySectionProps) {
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

  return (
    <>
      <div className="mt-8">
        <DashboardMetrics stats={stats} isLoading={isStatsLoading} />
      </div>

      <div className="mt-10 border-t border-border pt-8">
        <div className="mb-4">
          <h2 className="text-lg font-medium text-foreground">Run History</h2>
          <p className="text-xs text-muted">
            Search, filter, and paginate through past QA reports.
          </p>
        </div>

        <RunSearchBar
          initialQuery={searchQuery}
          initialStatus={statusFilter}
          onSearch={handleSearch}
          onStatusChange={handleStatusChange}
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
    </>
  );
}
