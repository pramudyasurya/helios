import Link from "next/link";
import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { AppHeader } from "@/components/helios/layout/app-header";
import { StatusBadge } from "@/components/helios/run/status-badge";
import { RunMetadata } from "@/components/helios/run/run-metadata";
import { RunEvidenceList } from "@/components/helios/evidence/run-evidence-list";
import { RunChecksList } from "@/components/helios/run/run-checks-list";
import { BrowserTrail } from "@/components/helios/run/browser-trail";

import { prisma } from "@/lib/prisma";
import { runRecordToLatestRun } from "@/lib/helios/server/run-record";
import { ExportRunButton } from "@/components/helios/run/export-run-button";

const getRunById = cache(async (id: string) => {
  return prisma.run.findUnique({ where: { id } });
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
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="text-sm text-muted hover:text-foreground transition"
          >
            Back to dashboard
          </Link>
          <div className="flex items-center gap-2">
            <StatusBadge status={run.status} />
            {run.status === "Completed" || run.status === "Failed" ? (
              <ExportRunButton run={run} />
            ) : null}
          </div>
        </div>

        <h1 className="text-lg font-semibold text-foreground mb-1 break-all">
          {run.title ?? run.startingUrl}
        </h1>
        {run.title ? (
          <p className="text-sm text-muted mb-6 break-all">{run.startingUrl}</p>
        ) : (
          <div className="mb-6" />
        )}

        <section className="rounded-lg border border-border bg-panel p-5 space-y-4">
          <RunMetadata run={run} />
          <RunEvidenceList
            brokenImages={run.brokenImages}
            consoleErrors={run.consoleErrors}
            failedRequests={run.failedRequests}
          />

          <RunChecksList checks={run.checks} />
          <BrowserTrail trail={run.trail} />
        </section>
      </div>
    </main>
  );
}
