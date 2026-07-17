import { prisma } from "@/lib/server/infrastructure/db/prisma";
import { AppHeader } from "@/components/shared/app-header";
import {
  GlobalEvidenceBoard,
  type BoardEvidenceItem,
} from "@/components/features/global-evidence-board";
import type { EvidenceType, EvidenceStatus } from "@/lib/shared/domain/types";
import { Prisma } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function EvidencePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const rawStatus =
    typeof params.status === "string" ? params.status : undefined;
  const rawType = typeof params.type === "string" ? params.type : undefined;

  let activeStatus: string = "open";
  if (
    rawStatus === "all" ||
    rawStatus === "resolved" ||
    rawStatus === "ignored"
  ) {
    activeStatus = rawStatus;
  } else if (rawStatus && rawStatus !== "open") {
    activeStatus = "open";
  }

  let activeType: string = "all";
  if (rawType === "image" || rawType === "console" || rawType === "network") {
    activeType = rawType;
  } else if (rawType && rawType !== "all") {
    activeType = "all";
  }

  const where: Prisma.EvidenceWhereInput = {};
  if (activeStatus !== "all") {
    where.status = activeStatus as EvidenceStatus;
  }
  if (activeType !== "all") {
    where.type = activeType as EvidenceType;
  }

  const [openCount, resolvedCount, ignoredCount, evidenceItems] =
    await Promise.all([
      prisma.evidence.count({ where: { status: "open" } }),
      prisma.evidence.count({ where: { status: "resolved" } }),
      prisma.evidence.count({ where: { status: "ignored" } }),
      prisma.evidence.findMany({
        where,
        include: { run: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    ]);

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
        <GlobalEvidenceBoard
          items={boardItems}
          activeStatus={activeStatus}
          activeType={activeType}
          counts={{
            open: openCount,
            resolved: resolvedCount,
            ignored: ignoredCount,
          }}
        />
      </div>
    </main>
  );
}
