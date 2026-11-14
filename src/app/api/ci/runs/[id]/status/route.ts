import { prisma } from "@/lib/server/infrastructure/db/prisma";
import {
  extractApiKeyFromRequest,
  verifyApiKey,
} from "@/lib/server/infrastructure/auth/api-key";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const rawKey = extractApiKeyFromRequest(request);
  if (!rawKey) {
    return Response.json(
      {
        error: "Unauthorized",
        message: "Missing API key in Authorization (Bearer) or x-api-key header.",
      },
      { status: 401 }
    );
  }

  const authResult = await verifyApiKey(rawKey);
  if (!authResult.valid || !authResult.projectId) {
    return Response.json(
      { error: "Unauthorized", message: "Invalid or inactive API key." },
      { status: 401 }
    );
  }

  const { id: runId } = await params;

  const run = await prisma.run.findUnique({
    where: { id: runId },
    select: {
      id: true,
      status: true,
      summary: true,
      startingUrl: true,
      finalUrl: true,
      createdAt: true,
      finishedAt: true,
      durationMs: true,
      origin: true,
      checks: true,
      environmentId: true,
      environment: {
        select: {
          id: true,
          name: true,
          projectId: true,
        },
      },
    },
  });

  if (!run) {
    return Response.json(
      { error: "Run not found", message: `No run exists with id '${runId}'.` },
      { status: 404 }
    );
  }

  // Security check: ensure run belongs to the authenticated project if project-linked
  if (run.environment && run.environment.projectId !== authResult.projectId) {
    return Response.json(
      {
        error: "Forbidden",
        message: "This run belongs to a different project.",
      },
      { status: 403 }
    );
  }
  // Compute QA metrics
  const checksArray = Array.isArray(run.checks)
    ? (run.checks as Array<{ status?: string }>)
    : [];
  const passedChecks = checksArray.filter((c) => c.status === "passed").length;
  const totalChecks = checksArray.length;
  const passRate =
    totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 100;
  const isTerminal = ["completed", "failed", "cancelled"].includes(
    run.status.toLowerCase()
  );

  return Response.json({
    runId: run.id,
    status: run.status,
    isTerminal,
    summary: run.summary,
    startingUrl: run.startingUrl,
    finalUrl: run.finalUrl,
    environment: run.environment
      ? { id: run.environment.id, name: run.environment.name }
      : null,
    metrics: {
      totalChecks,
      passedChecks,
      passRate,
      durationMs: run.durationMs,
    },
    createdAt: run.createdAt,
    finishedAt: run.finishedAt,
  });
}
