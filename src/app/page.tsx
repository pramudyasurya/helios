"use client";

import { Suspense, useState, useCallback, useMemo, useRef } from "react";
import { useRunDashboard } from "@/lib/client/use-run-dashboard";
import {
  type KeyboardShortcut,
  useKeyboardShortcuts,
} from "@/lib/client/use-keyboard-shortcuts";

import { AppHeader } from "@/components/shared/app-header";
import { DashboardHero } from "@/app/_components/dashboard-hero";
import { RunForm } from "@/components/features/run-form";
import { LatestRunPanel } from "@/components/features/latest-run-panel";
import { RunHistorySection } from "@/app/_components/run-history-section";
import { RecentRunsSkeleton } from "@/app/_components/recent-runs-skeleton";
import { DashboardMetrics } from "@/components/features/dashboard-metrics";

export default function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [dbConnectedState, setDbConnectedState] = useState<boolean | null>(
    null,
  );
  const runUrlInputRef = useRef<HTMLInputElement>(null);
  const runSearchInputRef = useRef<HTMLInputElement>(null);

  const handleRunComplete = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  const { latestRun, runError, isRunActive, handleSubmit, handleReset } =
    useRunDashboard(handleRunComplete);

  const keyboardShortcuts = useMemo<KeyboardShortcut[]>(
    () => [
      {
        key: "r",
        altKey: true,
        onTrigger: () => runUrlInputRef.current?.focus(),
      },
      {
        key: "s",
        altKey: true,
        onTrigger: () => runSearchInputRef.current?.focus(),
      },
    ],
    [],
  );

  useKeyboardShortcuts(keyboardShortcuts);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <AppHeader />

      <div className="py-8 px-4 sm:px-6 mx-auto max-w-7xl">
        <DashboardHero
          isRunActive={isRunActive}
          isDbConnected={dbConnectedState}
        />

        <Suspense fallback={<RecentRunsSkeleton />}>
          <RunHistorySection
            refreshTrigger={refreshTrigger}
            searchInputRef={runSearchInputRef}
            renderMetrics={(stats, isLoading) => {
              return (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  <div className="lg:col-span-7 space-y-6">
                    <RunForm
                      onSubmit={handleSubmit}
                      isDisabled={isRunActive}
                      error={runError}
                      urlInputRef={runUrlInputRef}
                    />

                    <LatestRunPanel
                      latestRun={latestRun}
                      onReset={handleReset}
                    />
                  </div>

                  <div className="lg:col-span-5">
                    <div className="rounded-xl border border-border/80 bg-panel/90 p-5 shadow-sm">
                      <div className="mb-3.5 flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-foreground">
                          Observability Metrics
                        </h2>
                        <span className="text-[11px] font-medium text-muted">
                          Real-time Summary
                        </span>
                      </div>
                      <DashboardMetrics stats={stats} isLoading={isLoading} />
                    </div>
                  </div>
                </div>
              );
            }}
            onDatabaseConnectionChange={setDbConnectedState}
          />
        </Suspense>
      </div>
    </main>
  );
}
