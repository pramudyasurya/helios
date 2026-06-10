"use client";
import { useState } from "react";

import type { LatestRun } from "@/lib/helios/types";

import { AppHeader } from "@/components/helios/app-header";
import { RunForm } from "@/components/helios/run-form";
import { LatestRunPanel } from "@/components/helios/latest-run-panel";
import { DashboardHero } from "@/components/helios/dashboard-hero";
import {
  FAKE_RUN_RUNNING_DELAY_MS,
  FAKE_RUN_COMPLETED_DELAY_MS,
  createQueuedFakeRun,
  markFakeRunRunning,
  markFakeRunCompleted,
} from "@/lib/helios/fake-run";

export default function Home() {
  const [latestRun, setLatestRun] = useState<LatestRun | null>(null);

  const isRunActive =
    latestRun?.status === "Queued" || latestRun?.status === "Running";

  const handleSubmit: React.ComponentProps<"form">["onSubmit"] = (e) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const url = formData.get("url")?.toString().trim() ?? "";

    const { run, startTime } = createQueuedFakeRun(url);
    const runId = run.id;

    setLatestRun(run);

    setTimeout(() => {
      setLatestRun((prev) => {
        if (!prev || prev.id !== runId) return prev;
        return markFakeRunRunning(prev);
      });
    }, FAKE_RUN_RUNNING_DELAY_MS);

    setTimeout(() => {
      setLatestRun((prev) => {
        if (!prev || prev.id !== runId) return prev;
        return markFakeRunCompleted(prev, startTime);
      });
    }, FAKE_RUN_COMPLETED_DELAY_MS);
  };

  const handleReset = () => {
    setLatestRun(null);
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <AppHeader />

      <div className="py-10 px-6 mx-auto max-w-5xl">
        <DashboardHero />
        <RunForm onSubmit={handleSubmit} isDisabled={isRunActive} />
        <LatestRunPanel latestRun={latestRun} onReset={handleReset} />
      </div>
    </main>
  );
}
