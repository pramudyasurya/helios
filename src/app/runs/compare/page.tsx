import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { GitCompareArrows } from "lucide-react";

import { AppShell } from "@/components/shared/app-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { prisma } from "@/lib/server/infrastructure/db/prisma";
import { runRecordToLatestRun } from "@/lib/server/infrastructure/runner/run-record";
import { compareRunVisuals } from "@/lib/server/infrastructure/runner/visual-diff";
import { computeRunDiff } from "@/lib/shared/domain/run-comparison";
import { compareChecks } from "@/lib/shared/domain/check-comparison";
import { formatTimestamp } from "@/lib/shared/domain/format";
import { HELIOS_ROUTES } from "@/lib/shared/domain/routes";
import { CompareRunTabs } from "./_components/compare-run-tabs";
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

const getRunById = cache(async (id: string) => {
  return prisma.run.findUnique({
    where: { id },
    include: {
      evidence: true,
      pageResults: true,
      environment: { include: { project: true } },
    },
  });
});

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  await searchParams;
  return { title: "Run comparison - Helios" };
}

export default async function CompareRunsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const runIdA = typeof params.a === "string" ? params.a : undefined;
  const runIdB = typeof params.b === "string" ? params.b : undefined;

  if (!runIdA || !runIdB) {
    const recentRuns = await prisma.run.findMany({
      where: { status: { in: ["Completed", "Failed"] } },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        title: true,
        startingUrl: true,
        createdAt: true,
        status: true,
      },
    });

    return (
      <AppShell>
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-6">
          <header className="rounded-xs border border-border/80 bg-linear-to-r from-panel/90 via-panel/70 to-card/60 px-6 py-5 shadow-xs">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              Run Comparison
            </h1>
            <p className="mt-1.5 max-w-3xl text-xs leading-relaxed text-muted sm:text-sm">
              Compare issues, visual drift, Core Web Vitals, and checks between two QA runs.
            </p>
          </header>

          {recentRuns.length < 2 ? (
            <EmptyState
              title="Need at least two completed runs"
              description="Execute another QA run to unlock comparison and visual diffing."
              icon={GitCompareArrows}
            />
          ) : (
            <form method="GET" action="/runs/compare" className="rounded-xs border border-border/80 bg-panel/90 p-6 shadow-sm space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="runA-select" className="text-xs font-semibold text-foreground">
                    Baseline Run (A)
                  </label>
                  <select
                    id="runA-select"
                    name="a"
                    defaultValue={runIdA ?? recentRuns[1]?.id}
                    className="w-full rounded-xs border border-border/80 bg-card/60 px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    {recentRuns.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.title ?? r.startingUrl} ({formatTimestamp(r.createdAt.toISOString())}) [{r.id.slice(0, 16)}]
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="runB-select" className="text-xs font-semibold text-foreground">
                    Target Run (B)
                  </label>
                  <select
                    id="runB-select"
                    name="b"
                    defaultValue={runIdB ?? recentRuns[0]?.id}
                    className="w-full rounded-xs border border-border/80 bg-card/60 px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    {recentRuns.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.title ?? r.startingUrl} ({formatTimestamp(r.createdAt.toISOString())}) [{r.id.slice(0, 16)}]
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-xs border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 px-4 py-2 text-xs font-semibold text-amber-400 transition cursor-pointer"
                >
                  <GitCompareArrows className="h-4 w-4" aria-hidden="true" />
                  Compare Selected Runs
                </button>
              </div>
            </form>
          )}
        </main>
      </AppShell>
    );
  }

  const [recordA, recordB] = await Promise.all([
    getRunById(runIdA),
    getRunById(runIdB),
  ]);

  if (!recordA || !recordB) {
    notFound();
  }

  const runA = runRecordToLatestRun(recordA);
  const runB = runRecordToLatestRun(recordB);
  const [comparison, checkTransitions, visualDiff] = await Promise.all([
    Promise.resolve(computeRunDiff(runA, runB)),
    Promise.resolve(compareChecks(runA, runB)),
    compareRunVisuals(runA.id, runB.id).catch(() => null),
  ]);

  const hasChanges =
    comparison.newIssues.length > 0 ||
    comparison.resolvedIssues.length > 0 ||
    comparison.recurringIssues.length > 0 ||
    Boolean(visualDiff?.hasVisualDiff) ||
    comparison.metricDeltas.some(
      (delta) => delta.direction !== "unchanged",
    ) ||
    checkTransitions.some(
      (transition) => transition.direction !== "unchanged",
    );

  const labelA = runA.title ?? runA.startingUrl;
  const labelB = runB.title ?? runB.startingUrl;
  return (
    <AppShell>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <header className="mb-6 rounded-xs border border-border/80 bg-linear-to-r from-panel/90 via-panel/70 to-card/60 px-6 py-5 shadow-xs">
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Run Comparison
          </h1>
          <p className="mt-1.5 max-w-3xl text-xs leading-relaxed text-muted sm:text-sm">
            Comparing{" "}
            <Link
              href={HELIOS_ROUTES.runDetail(runA.id)}
              className="text-accent hover:underline"
            >
              {labelA}
            </Link>{" "}
            (run A, {formatTimestamp(runA.createdAt)}) vs{" "}
            <Link
              href={HELIOS_ROUTES.runDetail(runB.id)}
              className="text-accent hover:underline"
            >
              {labelB}
            </Link>{" "}
            (run B, {formatTimestamp(runB.createdAt)}).
          </p>
        </header>
        {hasChanges ? (
          <CompareRunTabs
            comparison={comparison}
            checkTransitions={checkTransitions}
            visualDiff={visualDiff}
          />
        ) : (
          <EmptyState
            title="No differences detected"
            description="Both runs produced the same issues, checks, and metrics."
            icon={GitCompareArrows}
          />
        )}
      </main>
    </AppShell>
  );
}
