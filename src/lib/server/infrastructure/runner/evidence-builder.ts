import "server-only";
import { randomUUID } from "node:crypto";

import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type { EvidenceType, PageResult } from "@/lib/shared/domain/types";
import {
  extractViewport,
  tryExtractUrl,
} from "@/lib/shared/domain/evidence-transformer";

type EvidenceRowContext = {
  runId: string;
  pageResultId: string;
  pageUrl: string;
};

function createEvidenceRow(
  context: EvidenceRowContext,
  type: EvidenceType,
  severity: string,
  content: string,
  viewport: string | undefined,
  resourceUrl: string | undefined,
): Prisma.EvidenceCreateManyInput {
  return {
    id: randomUUID(),
    runId: context.runId,
    pageResultId: context.pageResultId,
    type,
    content,
    pageUrl: context.pageUrl,
    resourceUrl,
    status: "open",
    severity,
    viewport,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function buildConsoleRows(
  items: string[] | undefined,
  context: EvidenceRowContext,
): Prisma.EvidenceCreateManyInput[] {
  return (items ?? []).map((raw) => {
    const { viewport, content } = extractViewport(raw);
    return createEvidenceRow(context, "console", "low", content, viewport, undefined);
  });
}

function buildNetworkRows(
  items: string[] | undefined,
  context: EvidenceRowContext,
): Prisma.EvidenceCreateManyInput[] {
  return (items ?? []).map((raw) => {
    const { viewport, content } = extractViewport(raw);
    return createEvidenceRow(
      context,
      "network",
      "medium",
      content,
      viewport,
      tryExtractUrl(content),
    );
  });
}

function buildImageRows(
  items: string[] | undefined,
  context: EvidenceRowContext,
): Prisma.EvidenceCreateManyInput[] {
  return (items ?? []).map((url) =>
    createEvidenceRow(context, "image", "low", url, undefined, url),
  );
}

export function buildEvidenceRows(
  pageResult: PageResult,
  runId: string,
  pageResultId: string,
): Prisma.EvidenceCreateManyInput[] {
  const context: EvidenceRowContext = {
    runId,
    pageResultId,
    pageUrl: pageResult.finalUrl ?? pageResult.url,
  };

  return [
    ...buildConsoleRows(pageResult.consoleErrors, context),
    ...buildNetworkRows(pageResult.failedRequests, context),
    ...buildImageRows(pageResult.brokenImages, context),
  ];
}

export async function persistPageEvidence({
  runId,
  pageResult,
  pageResultId,
  prisma,
}: {
  runId: string;
  pageResult: PageResult;
  pageResultId: string;
  prisma: PrismaClient;
}): Promise<void> {
  const rows = buildEvidenceRows(pageResult, runId, pageResultId);
  if (rows.length === 0) return;
  await prisma.evidence.createMany({ data: rows });
}

export function pageResultToCreateInput(
  pageResult: PageResult,
  runId: string,
): Prisma.PageResultCreateManyInput {
  return {
    id: pageResult.id,
    runId,
    url: pageResult.url,
    depth: pageResult.depth,
    status: pageResult.status,
    statusCode: pageResult.statusCode,
    finalUrl: pageResult.finalUrl,
    title: pageResult.title,
    description: pageResult.description,
    durationMs: pageResult.durationMs,
    artifacts: pageResult.artifacts,
    brokenImages: pageResult.brokenImages,
    consoleErrors: pageResult.consoleErrors,
    failedRequests: pageResult.failedRequests,
    loadMetrics: pageResult.loadMetrics,
    createdAt: new Date(pageResult.createdAt),
    updatedAt: new Date(pageResult.updatedAt),
  };
}
