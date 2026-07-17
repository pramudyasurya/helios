import { getErrorMessage } from "@/lib/shared/domain/errors";
import { prisma } from "@/lib/server/infrastructure/db/prisma";
import { GetRunsQuerySchema } from "@/lib/shared/domain/validators";
import { Prisma } from "@/generated/prisma/client";
import { unstable_cache } from "next/cache";

const getCachedStatsData = unstable_cache(
  async (q: string, status: string) => {
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

    const [statusGroups, durationAggr, recentRuns] = await Promise.all([
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
    ]);

    return {
      statusGroups,
      durationAggr,
      recentRuns,
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
    if (value === "" || (key === "status" && value === "All")) {
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

  const { q, status } = validation.data;

  try {
    const { statusGroups, durationAggr, recentRuns } = await getCachedStatsData(
      q,
      status || "",
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

    return Response.json({
      totalRuns,
      completedRuns,
      failedRuns,
      avgDurationMs,
      recentDurations,
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
