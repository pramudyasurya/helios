import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/server/infrastructure/db/prisma";

import { AppShell } from "@/components/shared/app-shell";
import { RunSummaryHeader } from "@/app/runs/[id]/_components/overview/summary-header";
import { runRecordToLatestRun } from "@/lib/server/infrastructure/runner/run-record";
import { RunDetailTabs } from "@/app/runs/[id]/_components/navigation/run-detail-tabs";

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

  const run = runRecordToLatestRun(record);

  return (
    <AppShell>
      <main className="py-8 px-4 sm:px-6 mx-auto max-w-7xl">
        <RunSummaryHeader run={run} />
        <div className="mt-6">
          <RunDetailTabs run={run} />
        </div>
      </main>
    </AppShell>
  );
}
