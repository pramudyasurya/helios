import { runSinglePageQA } from "@/lib/helios/server/runner";
import {
  CreateRunSchema,
  GetRunsQuerySchema,
} from "@/lib/helios/shared/validators";

import { prisma } from "@/lib/prisma";
import { createChecksFromRunResult } from "@/lib/helios/shared/checks";
import { runRecordToLatestRun } from "@/lib/helios/server/run-record";
import { getErrorMessage } from "@/lib/helios/shared/errors";
import { transformRawEvidence } from "@/lib/helios/shared/evidence-transformer";
import { Prisma } from "@/generated/prisma/client";

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

  const validation = CreateRunSchema.safeParse(body);

  if (!validation.success) {
    return Response.json(
      {
        error: "Invalid URL",
        message:
          validation.error.issues[0]?.message || "Please submit a valid URL.",
        details: validation.error.issues,
      },
      { status: 400 },
    );
  }

  const submittedUrl = validation.data.url;

  const now = new Date();
  const runId = `run_${now.getTime()}`;

  let result: Awaited<ReturnType<typeof runSinglePageQA>>;

  try {
    result = await runSinglePageQA({
      submittedUrl,
      runId,
    });
  } catch (error) {
    const message = getErrorMessage(error, "Unknown Playwright error.");
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
  const structuredEvidence = transformRawEvidence({
    runId: result.id,
    capturedAt: result.finishedAt ?? result.createdAt,
    pageUrl: result.finalUrl ?? result.startingUrl,
    brokenImages: result.brokenImages,
    consoleErrors: result.consoleErrors,
    failedRequests: result.failedRequests,
  });

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
        evidence:
          structuredEvidence.length > 0
            ? {
                create: structuredEvidence.map((item) => ({
                  type: item.type,
                  content: item.content,
                  pageUrl: item.pageUrl,
                  resourceUrl: item.resourceUrl,
                  status: item.status,
                })),
              }
            : undefined,
      },
    });
  } catch (dbError) {
    console.error("Failed to persist completed run:", dbError);
  }

  return Response.json(result);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawParams = Object.fromEntries(searchParams);

    if (rawParams.status === "All" || rawParams.status === "") {
      delete rawParams.status;
    }

    for (const [key, value] of Object.entries(rawParams)) {
      if (value === "" || (key === "status" && value === "All")) {
        delete rawParams[key];
      }
    }

    const validation = GetRunsQuerySchema.safeParse(rawParams);

    if (!validation.success) {
      return Response.json(
        {
          error: "Invalid Query Parameters",
          message:
            validation.error.issues[0]?.message ||
            "Invalid search or pagination parameters.",
          details: validation.error.issues,
        },
        {
          status: 400,
        },
      );
    }

    const { q, status, page, limit } = validation.data;
    const skip = (page - 1) * limit;

    const where: Prisma.RunWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (q) {
      where.OR = [
        {
          startingUrl: {
            contains: q,
            mode: "insensitive",
          },
        },
        {
          title: {
            contains: q,
            mode: "insensitive",
          },
        },
      ];
    }

    const [total, runs] = await Promise.all([
      prisma.run.count({ where }),
      prisma.run.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
    ]);

    return Response.json({
      data: runs.map(runRecordToLatestRun),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return Response.json(
      {
        error: "Failed to fetch runs",
        message: getErrorMessage(error, "Database error"),
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
        message: getErrorMessage(error, "Database error"),
      },
      { status: 500 },
    );
  }
}
