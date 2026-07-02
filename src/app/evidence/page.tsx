import { prisma } from "@/lib/prisma";
import {
  GlobalEvidenceBoard,
  type BoardEvidenceItem,
} from "@/components/helios/evidence/global-evidence-board";
import type { EvidenceType, EvidenceStatus } from "@/lib/helios/shared/types";
import { AppHeader } from "@/components/helios/layout/app-header";

export const dynamic = "force-dynamic";

export default async function EvidencePage() {
  const evidenceItems = await prisma.evidence.findMany({
    include: { run: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const boardItems: BoardEvidenceItem[] = evidenceItems.map((item) => ({
    id: item.id,
    type: item.type as EvidenceType,
    status: item.status as EvidenceStatus,
    content: item.content,
    pageUrl: item.pageUrl,
    resourceUrl: item.resourceUrl ?? undefined,
    capturedAt: item.createdAt.toISOString(),

    runId: item.runId,
    runTitle: item.run.title ?? item.run.finalUrl ?? item.run.startingUrl,
    runUrl: item.run.finalUrl ?? item.run.startingUrl,
  }));

  return (
    <main className="min-h-screen bg-background text-foreground">
      <AppHeader />

      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Global Evidence Board
          </h1>
          <p className="mt-1 text-sm text-muted">
            Review and manage issues detected across all test runs.
          </p>
        </div>
        <GlobalEvidenceBoard items={boardItems} />
      </div>
    </main>
  );
}
