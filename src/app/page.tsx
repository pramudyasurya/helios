"use client";
import { useState } from "react";
import type { LatestRun } from "@/lib/helios/types";
import { StatusBadge } from "@/components/helios/status-badge";
import { OverviewCard } from "@/components/helios/overview-card";

type OverviewCardData = {
  title: string;
  emptyText: string;
  activeText: string;
};

export default function Home() {
  const [latestRun, setLatestRun] = useState<LatestRun | null>(null);

  const hasRun = Boolean(latestRun);

  const overviewCards: OverviewCardData[] = [
    {
      title: "Evidence",
      emptyText: "No evidence",
      activeText: "Evidence pending",
    },
    {
      title: "Trail",
      emptyText: "No trail",
      activeText: "1 step queued",
    },
    {
      title: "Artifacts",
      emptyText: "No artifacts",
      activeText: "Screenshot pending",
    },
    {
      title: "Findings",
      emptyText: "No findings",
      activeText: "QA checks pending",
    },
  ];

  const handleSubmit: React.ComponentProps<"form">["onSubmit"] = (e) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const url = formData.get("url")?.toString().trim() ?? "";

    const now = new Date();

    setLatestRun({
      id: `run_${now.getTime()}`,
      startingUrl: url,
      status: "Queued",
      createdAt: now.toISOString(),
    });
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

        <section className="mt-10 rounded-lg border border-border bg-panel p-5">
          <form aria-label="Create browser run" onSubmit={handleSubmit}>
            <label
              htmlFor="url-target"
              className="text-sm font-medium text-foreground"
            >
              Starting URL
            </label>
            <div className="mt-2 flex flex-col sm:flex-row gap-3">
              <input
                type="url"
                name="url"
                id="url-target"
                className="flex-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none"
                placeholder="https://example.com"
                required
              />
              <button
                className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-background sm:w-auto"
                type="submit"
              >
                Run QA Check
              </button>
            </div>
          </form>
        </section>

        <section className="mt-6 rounded-lg border border-border bg-panel p-5">
          <header className="text-base font-medium flex items-center justify-between">
            <h2>Latest run</h2>
            <div className="flex items-center gap-2">
              <StatusBadge status={latestRun?.status ?? "Idle"} />
              {latestRun ? (
                <button
                  onClick={handleReset}
                  className="rounded-full border border-border px-2 py-1 text-xs text-muted hover:text-foreground"
                >
                  Reset
                </button>
              ) : null}
            </div>
          </header>
          <div className="mt-4 text-sm text-muted">
            {latestRun ? (
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-sm text-muted">Run ID</p>
                  <p className="text-foreground break-all">{latestRun.id}</p>
                </div>

                <div>
                  <p className="text-sm text-muted">Queued at</p>
                  <p className="text-foreground break-all">
                    {latestRun.createdAt}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted">Starting URL</p>
                  <p className="text-foreground break-all">
                    {latestRun.startingUrl}
                  </p>
                </div>
              </div>
            ) : (
              "No runs yet"
            )}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {overviewCards.map((card) => (
              <OverviewCard
                key={card.title}
                title={card.title}
                description={hasRun ? card.activeText : card.emptyText}
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
