import {
  CreateRunSchema,
  GetRunsQuerySchema,
} from "@/lib/shared/domain/validators";
import { revalidateTag } from "next/cache";

import { prisma } from "@/lib/server/infrastructure/db/prisma";
import { enqueueQARun } from "@/lib/server/infrastructure/queue/qa-jobs";
import { runRecordToLatestRun } from "@/lib/server/infrastructure/runner/run-record";
import { clearAllRunArtifacts } from "@/lib/server/infrastructure/runner/artifacts";
import { getErrorMessage } from "@/lib/shared/domain/errors";
import { Prisma } from "@/generated/prisma/client";

type CreateRunRequest = {
  url?: string;
  mode?: "single" | "manual" | "crawl";
  routes?: string[];
  maxPages?: number;
  maxDepth?: number;
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
        error: "Invalid run configuration",
        message:
          validation.error.issues[0]?.message ||
          "Please submit a valid run configuration.",
        details: validation.error.issues,
      },
      { status: 400 },
    );
  }

  const { url: submittedUrl, mode, routes, maxPages, maxDepth } = validation.data;
  const now = new Date();
  const runId = `run_${now.getTime()}`;

  try {
    await prisma.run.create({
      data: {
        id: runId,
        startingUrl: submittedUrl,
        status: "Queued",
        summary: "Helios queued this browser QA run.",
        createdAt: now,
        trail: [
          {
            label: "Run queued",
            detail: `Helios queued a ${mode} browser QA run.`, 
            timestamp: now.toISOString(),
          },
        ],
        checks: [],
      },
    });

    await enqueueQARun({
      runId,
      submittedUrl,
      mode,
      routes,
      maxPages,
      maxDepth,
    });
    revalidateTag("run-stats", "max");

    return Response.json({ id: runId, status: "queued" }, { status: 202 });
  } catch (error) {
    const message = getErrorMessage(error, "Unable to queue the browser QA run.");

    try {
      await prisma.run.update({
        where: { id: runId },
        data: {
          status: "Failed",
          summary: "Helios could not queue the browser QA run.",
          finishedAt: new Date(),
          checks: [
            {
              title: "Run queueing failed",
              detail: message,
              status: "failed",
              severity: "high",
            },
          ],
        },
      });
      revalidateTag("run-stats", "max");
    } catch (updateError) {
      console.error("Failed to persist queueing failure:", updateError);
    }

    return Response.json(
      {
        error: "Unable to queue browser run",
        message,
      },
      { status: 503 },
    );
  }
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
    await clearAllRunArtifacts();
    revalidateTag("run-stats", "max");
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
