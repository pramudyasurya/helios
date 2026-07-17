"use client";

import { Suspense, useState, useCallback } from "react";
import { useRunDashboard } from "@/lib/client/use-run-dashboard";

import { AppHeader } from "@/components/shared/app-header";
import { DashboardHero } from "@/app/_components/dashboard-hero";
import { RunForm } from "@/components/features/run-form";
import { LatestRunPanel } from "@/components/features/latest-run-panel";
import { RunHistorySection } from "@/app/_components/run-history-section";
import { RecentRunsSkeleton } from "@/app/_components/recent-runs-skeleton";

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
