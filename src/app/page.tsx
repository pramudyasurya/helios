"use client";

import { Suspense, useState, useCallback, useMemo, useRef } from "react";
import { useRunDashboard } from "@/lib/client/use-run-dashboard";
import {
  type KeyboardShortcut,
  useKeyboardShortcuts,
} from "@/lib/client/use-keyboard-shortcuts";

import { AppShell } from "@/components/shared/app-shell";
import { DashboardHero } from "@/app/_components/dashboard-hero";
import { RunForm } from "@/components/features/run-form";
import { LatestRunPanel } from "@/components/features/latest-run-panel";
import { RunHistorySection } from "@/app/_components/run-history-section";
import { RecentRunsSkeleton } from "@/app/_components/recent-runs-skeleton";

export default function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [dbConnectedState, setDbConnectedState] = useState<boolean | null>(
    null,
  );
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>();
  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState<string | undefined>();

  const runUrlInputRef = useRef<HTMLInputElement>(null);
  const runSearchInputRef = useRef<HTMLInputElement>(null);

  const handleRunComplete = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  const handleTargetContextChange = useCallback(
    (projectId?: string, environmentId?: string) => {
      setSelectedProjectId(projectId);
      setSelectedEnvironmentId(environmentId);
    },
    [],
  );

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
    <AppShell activeTab="dashboard">
      <main className="py-8 px-4 sm:px-6 mx-auto max-w-7xl space-y-6">
        <DashboardHero
          isRunActive={isRunActive}
          isDbConnected={dbConnectedState}
        />

        <RunForm
          onSubmit={handleSubmit}
          isDisabled={isRunActive}
          error={runError}
          urlInputRef={runUrlInputRef}
          onTargetContextChange={handleTargetContextChange}
        />

        <LatestRunPanel latestRun={latestRun} onReset={handleReset} />

        <Suspense fallback={<RecentRunsSkeleton />}>
          <RunHistorySection
            refreshTrigger={refreshTrigger}
            projectId={selectedProjectId}
            environmentId={selectedEnvironmentId}
            searchInputRef={runSearchInputRef}
            onDatabaseConnectionChange={setDbConnectedState}
          />
        </Suspense>
      </main>
    </AppShell>
  );
}
