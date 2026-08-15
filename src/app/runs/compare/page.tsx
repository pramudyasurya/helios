import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { GitCompareArrows } from "lucide-react";

import { AppShell } from "@/components/shared/app-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { prisma } from "@/lib/server/infrastructure/db/prisma";
import { runRecordToLatestRun } from "@/lib/server/infrastructure/runner/run-record";
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
    return (
      <AppShell>
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <EmptyState
            title="Select two runs to compare"
            description="Open the comparison from a run detail page to see what changed between two runs."
            icon={GitCompareArrows}
          />
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
  const comparison = computeRunDiff(runA, runB);
  const checkTransitions = compareChecks(runA, runB);

  const hasChanges =
    comparison.newIssues.length > 0 ||
    comparison.resolvedIssues.length > 0 ||
    comparison.recurringIssues.length > 0 ||
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
