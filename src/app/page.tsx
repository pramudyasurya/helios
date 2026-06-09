"use client";
import { useState } from "react";
import type { LatestRun } from "@/lib/helios/types";
import { RunForm } from "@/components/helios/run-form";
import { LatestRunPanel } from "@/components/helios/latest-run-panel";

export default function Home() {
  const [latestRun, setLatestRun] = useState<LatestRun | null>(null);

  const isRunActive =
    latestRun?.status === "Queued" || latestRun?.status === "Running";

  const handleSubmit: React.ComponentProps<"form">["onSubmit"] = (e) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const url = formData.get("url")?.toString().trim() ?? "";

    const now = new Date();
    const runId = `run_${now.getTime()}`;

    setLatestRun({
      id: runId,
      startingUrl: url,
      status: "Queued",
      createdAt: now.toISOString(),
      trail: [
        {
          label: "QA run queued",
          detail: "Waiting to launch a browser session.",
        },
      ],
    });

    setTimeout(() => {
      setLatestRun((prev) => {
        if (!prev || prev.id !== runId) return prev;
        return {
          ...prev,
          status: "Running",
          trail: [
            ...prev.trail,
            {
              label: "QA agent is running",
              detail: "Browser session is being launched.",
            },
          ],
        };
      });
    }, 1000);

    setTimeout(() => {
      setLatestRun((prev) => {
        if (!prev || prev.id !== runId) return prev;
        return {
          ...prev,
          status: "Completed",
          trail: [
            ...prev.trail,
            {
              label: "Navigated to URL",
              detail: "Helios navigated the browser to the submitted URL.",
            },
            {
              label: "Page loaded",
              detail: "The page reached a loaded state.",
            },
            {
              label: "Desktop screenshot captured",
              detail: "Desktop viewport screenshot was captured.",
            },
            {
              label: "Mobile screenshot captured",
              detail: "Mobile viewport screenshot was captured.",
            },
            {
              label: "Console logs collected",
              detail: "Console logs were collected for review.",
            },
            {
              label: "Network failures checked",
              detail: "Failed network requests were checked.",
            },
            {
              label: "QA run completed",
              detail: "Browser session has been finished.",
            },
          ],
        };
      });
    }, 3000);
  };

  const handleReset = () => {
    setLatestRun(null);
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="py-10 px-6 mx-auto max-w-5xl">
        <header>
          <h1 className="text-4xl font-semibold tracking-tight">Helios</h1>
          <p className="mt-3 max-w-2xl text-muted">
            Run QA checks with screenshots, evidence, and replayable browser
            trails.
          </p>
        </header>

        <RunForm onSubmit={handleSubmit} isDisabled={isRunActive} />

        <LatestRunPanel latestRun={latestRun} onReset={handleReset} />
      </div>
    </main>
  );
}
