import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/server/infrastructure/db/prisma";

import { AppShell } from "@/components/shared/app-shell";
import { runRecordToLatestRun } from "@/lib/server/infrastructure/runner/run-record";
import { RunDetailTabs } from "@/app/runs/[id]/_components/navigation/run-detail-tabs";

const getRunById = cache(async (id: string) => {
  return prisma.run.findUnique({
    where: { id },
    include: {
      evidence: true,
      pageResults: true,
      environment: { include: { project: true } },
      runIssues: {
        select: {
          status: true,
          evidenceIds: true,
          issue: { select: { type: true } },
        },
      },
    },
  });
});


export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const record = await getRunById(id);

  if (!record) {
    return {
      title: "Run not found - Helios",
    };
  }

  const label = record.title ?? record.startingUrl;
  return {
    title: `${label} - Helios`,
  };
}

export default async function RunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const record = await getRunById(id);

  if (!record) {
    notFound();
  }

  const previousRecord = await prisma.run.findFirst({
    where: {
      id: { not: id },
      status: { in: ["Completed", "Failed"] },
      ...(record.environmentId
        ? { environmentId: record.environmentId }
        : { startingUrl: record.startingUrl }),
      createdAt: { lt: record.createdAt },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  const run = runRecordToLatestRun(record);

  const newIssueEvidenceIds = new Set(
    (record.runIssues ?? [])
      .filter((runIssue) => runIssue.status === "new")
      .flatMap((runIssue) => runIssue.evidenceIds),
  );

  return (
    <AppShell>
      <main className="py-8 px-4 sm:px-6 mx-auto max-w-7xl">
        <RunDetailTabs
          run={run}
          newIssueEvidenceIds={newIssueEvidenceIds}
          previousRunId={previousRecord?.id}
        />
      </main>
    </AppShell>
  );
}
