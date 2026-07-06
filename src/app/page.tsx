"use client";

import { Suspense, useState, useCallback } from "react";
import { useRunDashboard } from "@/lib/helios/client/use-run-dashboard";

import { AppHeader } from "@/components/helios/layout/app-header";
import { DashboardHero } from "@/components/helios/layout/dashboard-hero";
import { RunForm } from "@/components/helios/run/run-form";
import { LatestRunPanel } from "@/components/helios/run/latest-run-panel";
import { RunHistorySection } from "@/components/helios/history/run-history-section";
import { RecentRunsSkeleton } from "@/components/helios/history/recent-runs-skeleton";

export default function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleRunComplete = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  const { latestRun, runError, isRunActive, handleSubmit, handleReset } =
    useRunDashboard(handleRunComplete);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <AppHeader />

      <div className="py-10 px-6 mx-auto max-w-5xl">
        <DashboardHero />

        <RunForm
          onSubmit={handleSubmit}
          isDisabled={isRunActive}
          error={runError}
        />

        <LatestRunPanel latestRun={latestRun} onReset={handleReset} />

        <Suspense fallback={<RecentRunsSkeleton />}>
          <RunHistorySection refreshTrigger={refreshTrigger} />
        </Suspense>
      </div>
    </main>
  );
}
