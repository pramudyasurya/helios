import { getErrorMessage } from "@/lib/helios/shared/errors";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [statusGroups, durationAggr, recentRuns] = await Promise.all([
      prisma.run.groupBy({
        by: ["status"],
        _count: {
          _all: true,
        },
      }),
      prisma.run.aggregate({
        _avg: {
          durationMs: true,
        },
      }),
      prisma.run.findMany({
        where: {
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
