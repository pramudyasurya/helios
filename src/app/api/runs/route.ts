import { runSinglePageQA } from "@/lib/helios/server/runner";
import { isValidHttpUrl } from "@/lib/helios/shared/validators";

import { prisma } from "@/lib/prisma";
import { createChecksFromRunResult } from "@/lib/helios/shared/checks";
import { runRecordToLatestRun } from "@/lib/helios/server/run-record";

type CreateRunRequest = {
  url?: string;
};

export async function POST(request: Request) {
  let body: CreateRunRequest;

  try {
    body = (await request.json()) as CreateRunRequest;
  } catch {
    return Response.json(
      {
        error: "Invalid JSON",
        message: "Please submit a JSON body with a url field.",
      },
      { status: 400 },
    );
  }

  const submittedUrl = body.url?.trim();

  if (!submittedUrl || !isValidHttpUrl(submittedUrl)) {
    return Response.json(
      {
        error: "Invalid URL",
        message: "Please submit a valid HTTP or HTTPS URL.",
      },
      { status: 400 },
    );
  }

  const now = new Date();
  const runId = `run_${now.getTime()}`;

  let result: Awaited<ReturnType<typeof runSinglePageQA>>;

  try {
    result = await runSinglePageQA({
      submittedUrl,
      runId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Playwright error.";
    const failedAt = new Date();

    try {
      await prisma.run.create({
        data: {
          id: runId,
          startingUrl: submittedUrl,
          status: "Failed",
          summary: "Helios could not complete the browser QA run.",
          createdAt: now,
          finishedAt: failedAt,
          durationMs: failedAt.getTime() - now.getTime(),
          trail: [],
          checks: [
            {
              title: "Browser run failed",
              detail: message,
              status: "failed",
              severity: "high",
            },
          ],
        },
      });
    } catch (dbError) {
      console.error("Failed to persist failed run:", dbError);
    }

    return Response.json(
      {
        error: "Browser run failed",
        message,
      },
      { status: 500 },
    );
  }
  const checks = createChecksFromRunResult(result);

  try {
    await prisma.run.create({
      data: {
        id: result.id,
        startingUrl: result.startingUrl,
        status: result.status,
        summary: result.summary,
        createdAt: new Date(result.createdAt),
        finishedAt: new Date(result.finishedAt),
        durationMs: result.durationMs,
        finalUrl: result.finalUrl,
        title: result.title,
        description: result.description,
        trail: result.trail,
        checks,
        artifacts: result.artifacts,
        brokenImages: result.brokenImages,
        consoleErrors: result.consoleErrors,
        failedRequests: result.failedRequests,
        loadMetrics: result.loadMetrics,
      },
    });
  } catch (dbError) {
    console.error("Failed to persist completed run:", dbError);
  }

  return Response.json(result);
}

export async function GET() {
  try {
    const runs = await prisma.run.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
    });

    return Response.json(runs.map(runRecordToLatestRun));
  } catch (error) {
    return Response.json(
      {
        error: "Failed to fetch runs",
        message: error instanceof Error ? error.message : "Database error",
      },
      {
        status: 500,
      },
    );
  }
}

export async function DELETE() {
  try {
    await prisma.run.deleteMany();
    return Response.json({ success: true });
  } catch (error) {
    return Response.json(
      {
        error: "Failed to clear runs",
        message: error instanceof Error ? error.message : "Database error",
      },
      { status: 500 },
    );
  }
}
