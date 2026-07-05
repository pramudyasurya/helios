"use client";

import { useRunDashboard } from "@/lib/helios/client/use-run-dashboard";

import { AppHeader } from "@/components/helios/layout/app-header";
import { DashboardHero } from "@/components/helios/layout/dashboard-hero";
import { RunForm } from "@/components/helios/run/run-form";
import { LatestRunPanel } from "@/components/helios/run/latest-run-panel";
import { RecentRunsList } from "@/components/helios/history/recent-runs-list";
import { RecentRunsSkeleton } from "@/components/helios/history/recent-runs-skeleton";
import { DashboardMetrics } from "@/components/helios/history/dashboard-metrics";
import { RunSearchBar } from "@/components/helios/history/run-search-bar";

export default function Home() {
  const {
    latestRun,
    runError,
    recentRuns,
    isHistoryLoading,
    historyError,
    isRunActive,
    handleSubmit,
    handleReset,
    handleClearRecentRuns,
    handleDeleteRun,
    stats,
    isStatsLoading,
    searchQuery,
    statusFilter,
    currentPage,
    totalPages,
    handleSearch,
    handleStatusChange,
    handlePageChange,
  } = useRunDashboard();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <AppHeader />

      <div className="py-10 px-6 mx-auto max-w-5xl">
        <DashboardHero />

        <div className="mt-8">
          <DashboardMetrics stats={stats} isLoading={isStatsLoading} />
        </div>

        <RunForm
          onSubmit={handleSubmit}
          isDisabled={isRunActive}
          error={runError}
        />

        <LatestRunPanel latestRun={latestRun} onReset={handleReset} />

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
      </div>
    </main>
  );
}
