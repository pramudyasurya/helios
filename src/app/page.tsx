"use client";

import { Suspense, useState, useCallback, useEffect, useRef } from "react";
import { useRunDashboard } from "@/lib/client/use-run-dashboard";

import { AppHeader } from "@/components/shared/app-header";
import { DashboardHero } from "@/app/_components/dashboard-hero";
import { RunForm } from "@/components/features/run-form";
import { LatestRunPanel } from "@/components/features/latest-run-panel";
import { RunHistorySection } from "@/app/_components/run-history-section";
import { RecentRunsSkeleton } from "@/app/_components/recent-runs-skeleton";

export default function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const runUrlInputRef = useRef<HTMLInputElement>(null);
  const runSearchInputRef = useRef<HTMLInputElement>(null);

  const handleRunComplete = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  const { latestRun, runError, isRunActive, handleSubmit, handleReset } =
    useRunDashboard(handleRunComplete);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        !event.altKey
      ) {
        return;
      }

      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName))
      ) {
        return;
      }

      if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        runUrlInputRef.current?.focus();
      }

      if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        runSearchInputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <AppHeader />

      <div className="py-10 px-6 mx-auto max-w-5xl">
        <DashboardHero />

        <RunForm
          onSubmit={handleSubmit}
          isDisabled={isRunActive}
          error={runError}
          urlInputRef={runUrlInputRef}
        />

        <LatestRunPanel latestRun={latestRun} onReset={handleReset} />

        <Suspense fallback={<RecentRunsSkeleton />}>
          <RunHistorySection
            refreshTrigger={refreshTrigger}
            searchInputRef={runSearchInputRef}
          />
        </Suspense>
      </div>
    </main>
  );
}
