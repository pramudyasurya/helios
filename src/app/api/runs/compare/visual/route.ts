import { z } from "zod";

import { prisma } from "@/lib/server/infrastructure/db/prisma";
import { compareRunVisuals } from "@/lib/server/infrastructure/runner/visual-diff";
import { getErrorMessage } from "@/lib/shared/domain/errors";

const CompareVisualQuerySchema = z.object({
  runA: z.string().trim().min(1),
  runB: z.string().trim().min(1),
  threshold: z.coerce.number().min(0).max(1).optional(),
});

export async function GET(request: Request) {
  const rawParams = Object.fromEntries(new URL(request.url).searchParams);
  const validation = CompareVisualQuerySchema.safeParse(rawParams);

  if (!validation.success) {
    return Response.json(
      {
        error: "Invalid query parameters",
        message:
          validation.error.issues[0]?.message ||
          "Provide both runA and runB run ids to compare visuals.",
        details: validation.error.issues,
      },
      { status: 400 },
    );
  }

  const { runA: idA, runB: idB, threshold } = validation.data;

  try {
    const [recordA, recordB] = await Promise.all([
      prisma.run.findUnique({ where: { id: idA }, select: { id: true } }),
      prisma.run.findUnique({ where: { id: idB }, select: { id: true } }),
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

    const visualComparison = await compareRunVisuals(idA, idB, {
      threshold,
    });

    return Response.json({ data: visualComparison });
  } catch (error) {
    return Response.json(
      {
        error: "Failed to compare run visuals",
        message: getErrorMessage(error, "Internal error"),
      },
      { status: 500 },
    );
  }
}
