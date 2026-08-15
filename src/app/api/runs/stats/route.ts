import { getErrorMessage } from "@/lib/shared/domain/errors";
import { prisma } from "@/lib/server/infrastructure/db/prisma";
import { GetRunsQuerySchema } from "@/lib/shared/domain/validators";
import { Prisma } from "@/generated/prisma/client";
import { unstable_cache } from "next/cache";

const getCachedStatsData = unstable_cache(
  async (q: string, status: string, projectId: string, environmentId: string) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const where: Prisma.RunWhereInput = {
      createdAt: {
        gte: thirtyDaysAgo,
      },
    };

    if (status) {
      where.status = status;
    }

    if (environmentId) {
      where.environmentId = environmentId;
    } else if (projectId) {
      where.environment = { projectId };
    }

    if (q) {
      where.OR = [
        {
          startingUrl: { contains: q, mode: "insensitive" },
        },
        {
          title: { contains: q, mode: "insensitive" },
        },
      ];
    }

    const [
      statusGroups,
      durationAggr,
      recentRuns,
      terminalRuns,
    ] = await Promise.all([
      prisma.run.groupBy({
        by: ["status"],
        where,
        _count: {
          _all: true,
        },
      }),
      prisma.run.aggregate({
        where: {
          ...where,
          status: "Completed",
        },
        _avg: {
          durationMs: true,
        },
      }),
      prisma.run.findMany({
        where: {
          ...where,
          durationMs: { not: null },
        },
        take: 10,
        orderBy: {
          createdAt: "desc",
        },
        select: {
          durationMs: true,
        },
      }),
      prisma.run.findMany({
        where: {
          ...where,
          status: { in: ["Completed", "Failed"] },
        },
        take: 30,
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    const consoleErrorCounts =
      terminalRuns.length > 0
        ? await prisma.evidence.groupBy({
            by: ["runId"],
            where: {
              runId: { in: terminalRuns.map((run) => run.id) },
              type: "console",
            },
            _count: {
              _all: true,
            },
          })
        : [];

    return {
      statusGroups,
      durationAggr,
      recentRuns,
      terminalRuns,
      consoleErrorCounts,
    };
  },
  ["run-stats"],
  {
    revalidate: 60,
    tags: ["run-stats"],
  },
);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawParams = Object.fromEntries(url.searchParams);
  for (const [key, value] of Object.entries(rawParams)) {
    if (
      value === "" ||
      (key === "status" &&
        (value === "All" || value.toLowerCase() === "all"))
    ) {
      delete rawParams[key];
    }
  }

  const validation = GetRunsQuerySchema.safeParse(rawParams);

  if (!validation.success) {
    return Response.json(
      {
        error: "Invalid query parameters",
        message: getErrorMessage(validation.error, "Invalid query parameters"),
      },
      {
        status: 400,
      },
    );
  }

  const { q, status, projectId, environmentId } = validation.data;

  try {
    const {
      statusGroups,
      durationAggr,
      recentRuns,
      terminalRuns,
      consoleErrorCounts,
    } = await getCachedStatsData(
      q,
      status || "",
      projectId || "",
      environmentId || "",
    );

    const recentDurations = recentRuns
      .map((r) => r.durationMs as number)
      .reverse();

    let completedRuns = 0;
    let failedRuns = 0;
    let totalRuns = 0;

    for (const group of statusGroups) {
      if (group.status === "Completed") completedRuns = group._count._all;
      if (group.status === "Failed") failedRuns = group._count._all;
      totalRuns += group._count._all;
    }

    const avgDurationMs = durationAggr._avg.durationMs
      ? Math.round(durationAggr._avg.durationMs)
      : 0;

    const errorCountByRunId = new Map(
      consoleErrorCounts.map((group) => [group.runId, group._count._all]),
    );

    const timeseries = terminalRuns
      .map((run) => ({
        date: run.createdAt.toISOString(),
        runId: run.id,
        passRate: run.status === "Completed" ? 100 : 0,
        errorCount: errorCountByRunId.get(run.id) ?? 0,
      }))
      .reverse();

    return Response.json({
      totalRuns,
      completedRuns,
      failedRuns,
      avgDurationMs,
      recentDurations,
      timeseries,
    });
  } catch (error) {
    return Response.json(
      {
        error: "Failed to fetch stats",
        message: getErrorMessage(error, "Database error"),
      },
      {
        status: 500,
      },
    );
  }
}
