import { getErrorMessage } from "@/lib/helios/shared/errors";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [statusGroups, durationAggr] = await Promise.all([
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
    ]);

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
