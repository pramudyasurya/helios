import { prisma } from "@/lib/server/infrastructure/db/prisma";
import { enqueueQARun } from "@/lib/server/infrastructure/queue/qa-jobs";
import {
  extractApiKeyFromRequest,
  verifyApiKey,
} from "@/lib/server/infrastructure/auth/api-key";

interface CiTriggerRequestBody {
  environment?: string; // name or UUID
  url?: string;
  mode?: "single" | "crawl";
  routes?: string[];
  maxPages?: number;
  maxDepth?: number;
}

export async function POST(request: Request) {
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
    const message =
      authResult.error === "expired"
        ? "API key has expired."
        : "Invalid or inactive API key.";
    return Response.json({ error: "Unauthorized", message }, { status: 401 });
  }

  let body: CiTriggerRequestBody = {};
  try {
    const text = await request.text();
    if (text) {
      body = JSON.parse(text) as CiTriggerRequestBody;
    }
  } catch {
    return Response.json(
      { error: "Invalid JSON", message: "Failed to parse JSON request body." },
      { status: 400 }
    );
  }

  // Resolve Environment within Project
  let environment = null;
  if (body.environment) {
    environment = await prisma.environment.findFirst({
      where: {
        projectId: authResult.projectId,
        OR: [{ id: body.environment }, { name: body.environment }],
      },
    });

    if (!environment) {
      return Response.json(
        {
          error: "Environment not found",
          message: `No environment '${body.environment}' exists under project '${authResult.projectName}'.`,
        },
        { status: 400 }
      );
    }
  } else {
    // Default to first environment or 'production' / 'staging'
    environment = await prisma.environment.findFirst({
      where: { projectId: authResult.projectId },
      orderBy: { createdAt: "asc" },
    });
  }

  const targetUrl = body.url || environment?.baseUrl;
  if (!targetUrl) {
    return Response.json(
      {
        error: "Target URL required",
        message:
          "Provide an explicit 'url' in the body or configure a 'baseUrl' on the environment.",
      },
      { status: 400 }
    );
  }

  // Generate unique run ID
  const now = new Date();
  const runId = `run_ci_${now.getTime()}_${Math.random().toString(36).substring(2, 8)}`;
  const selectedMode = body.mode || "single";

  // Persist queued run record
  await prisma.run.create({
    data: {
      id: runId,
      startingUrl: targetUrl,
      status: "Queued",
      summary: `Helios queued CI browser QA run for ${authResult.projectName}.`,
      createdAt: now,
      trail: [
        {
          label: "CI Run queued",
          detail: `Triggered via CI/CD API Key (${authResult.projectName}).`,
          timestamp: now.toISOString(),
        },
      ],
      checks: [],
      environmentId: environment?.id,
      origin: "ci",
    },
  });

  // Enqueue QA Run with pg-boss
  const jobId = await enqueueQARun({
    runId,
    submittedUrl: targetUrl,
    mode: selectedMode,
    routes: body.routes || [],
    maxPages: body.maxPages,
    maxDepth: body.maxDepth,
  });

  const originUrl = new URL(request.url).origin;

  return Response.json(
    {
      success: true,
      runId,
      status: "queued",
      projectId: authResult.projectId,
      projectName: authResult.projectName,
      environment: environment ? { id: environment.id, name: environment.name } : null,
      targetUrl,
      mode: selectedMode,
      statusUrl: `${originUrl}/api/ci/runs/${runId}/status`,
      viewUrl: `${originUrl}/runs/${runId}`,
      jobId,
    },
    { status: 202 }
  );
}
