import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/infrastructure/db/prisma";
import { getErrorMessage } from "@/lib/shared/domain/errors";
import type { EvidenceType } from "@/lib/shared/domain/types";

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ projectId: string; envId: string }>;
  },
) {
  try {
    const { projectId, envId } = await params;

    const environment = await prisma.environment.findUnique({
      where: { id: envId },
      select: { id: true, projectId: true },
    });

    if (!environment || environment.projectId !== projectId) {
      return NextResponse.json(
        { error: "Environment not found" },
        { status: 404 },
      );
    }

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");
    const typeParam = searchParams.get("type");

    const where: {
      environmentId: string;
      status?: string;
      type?: EvidenceType;
    } = {
      environmentId: envId,
    };

    if (statusParam && ["open", "acknowledged", "resolved", "ignored"].includes(statusParam)) {
      where.status = statusParam;
    }

    if (typeParam && ["console", "network", "image"].includes(typeParam)) {
      where.type = typeParam as EvidenceType;
    }

    const [issues, total] = await Promise.all([
      prisma.issue.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take: 100,
        select: {
          id: true,
          fingerprint: true,
          type: true,
          normalizedMessage: true,
          firstSeenRunId: true,
          lastSeenRunId: true,
          occurrences: true,
          status: true,
          resolvedBy: true,
          resolvedAtRunId: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.issue.count({ where }),
    ]);

    return NextResponse.json({ issues, total });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}
