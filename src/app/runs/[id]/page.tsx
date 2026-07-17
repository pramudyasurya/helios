import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/server/infrastructure/db/prisma";

import { AppHeader } from "@/components/shared/app-header";
import { RunSummaryHeader } from "@/app/runs/[id]/_components/summary-header";
import { runRecordToLatestRun } from "@/lib/server/infrastructure/runner/run-record";
import { RunDetailTabs } from "@/app/runs/[id]/_components/run-detail-tabs";

const getRunById = cache(async (id: string) => {
  return prisma.run.findUnique({
    where: { id },
    include: {
      evidence: true,
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
    <main className="min-h-screen bg-background text-foreground">
      <AppHeader />
      <div className="py-10 px-6 mx-auto max-w-5xl">
        <RunSummaryHeader run={run} />
        <div className="rounded-lg border border-border bg-panel p-5">
          <RunDetailTabs run={run} />
        </div>
      </div>
    </main>
  );
}
