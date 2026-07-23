import { useRunHistory } from "@/lib/client/use-run-dashboard";
import type { RefObject, ReactNode } from "react";
import { DashboardMetrics } from "@/components/features/dashboard-metrics";
import { RunSearchBar } from "@/app/_components/run-search-bar";
import { RecentRunsSkeleton } from "@/app/_components/recent-runs-skeleton";
import { RecentRunsList } from "@/components/features/recent-runs-list";
import type { RunStats } from "@/lib/shared/domain/types";

type RunHistorySectionProps = {
  refreshTrigger: number;
  searchInputRef?: RefObject<HTMLInputElement | null>;
  renderMetrics?: (stats: RunStats | null, isStatsLoading: boolean) => ReactNode;
};

export function RunHistorySection({
  refreshTrigger,
  searchInputRef,
  renderMetrics,
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

  const metricsContent = renderMetrics ? (
    renderMetrics(stats, isStatsLoading)
  ) : (
    <div className="mt-8">
      <DashboardMetrics stats={stats} isLoading={isStatsLoading} />
    </div>
  );

  return (
    <>
      {renderMetrics ? metricsContent : null}

      {!renderMetrics && (
        <div className="mt-8">
          <DashboardMetrics stats={stats} isLoading={isStatsLoading} />
        </div>
      )}

      <div className="mt-10 border-t border-border/80 pt-8">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground">Run History</h2>
          <p className="text-xs text-muted">
            Search, filter, and inspect past QA runs and evidence reports.
          </p>
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
    </>
  );
}
