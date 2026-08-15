import { z } from "zod";

import { prisma } from "@/lib/server/infrastructure/db/prisma";
import { runRecordToLatestRun } from "@/lib/server/infrastructure/runner/run-record";
import { computeRunDiff } from "@/lib/shared/domain/run-comparison";
import { getErrorMessage } from "@/lib/shared/domain/errors";

const CompareRunsQuerySchema = z.object({
  runA: z.string().trim().min(1),
  runB: z.string().trim().min(1),
});

const RUN_INCLUDE = {
  evidence: true,
  pageResults: true,
  environment: { include: { project: true } },
} as const;

export async function GET(request: Request) {
  const rawParams = Object.fromEntries(new URL(request.url).searchParams);
  const validation = CompareRunsQuerySchema.safeParse(rawParams);

  if (!validation.success) {
    return Response.json(
      {
        error: "Invalid query parameters",
        message:
          validation.error.issues[0]?.message ||
          "Provide both runA and runB run ids to compare.",
        details: validation.error.issues,
      },
      { status: 400 },
    );
  }

  const { runA: idA, runB: idB } = validation.data;

  try {
    const [recordA, recordB] = await Promise.all([
      prisma.run.findUnique({ where: { id: idA }, include: RUN_INCLUDE }),
      prisma.run.findUnique({ where: { id: idB }, include: RUN_INCLUDE }),
    ]);

    if (!recordA || !recordB) {
      return Response.json(
        {
          error: "Not found",
          message: "One or both of the requested runs were not found.",
        },
        { status: 404 },
      );
    }

    const comparison = computeRunDiff(
      runRecordToLatestRun(recordA),
      runRecordToLatestRun(recordB),
    );

    return Response.json({ data: comparison });
  } catch (error) {
    return Response.json(
      {
        error: "Failed to compare runs",
        message: getErrorMessage(error, "Database error"),
      },
      { status: 500 },
    );
  }
}
