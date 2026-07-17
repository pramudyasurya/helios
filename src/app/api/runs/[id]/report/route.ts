import { Prisma } from "@/generated/prisma/client";
import { generateAIReport } from "@/lib/server/infrastructure/ai/ollama";
import { runRecordToLatestRun } from "@/lib/server/infrastructure/runner/run-record";
import { getErrorMessage } from "@/lib/shared/domain/errors";
import { validateAIReport } from "@/lib/shared/domain/validators";
import { prisma } from "@/lib/server/infrastructure/db/prisma";
import { NextRequest } from "next/server";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const run = await prisma.run.findUnique({
      where: { id },
      include: {
        evidence: true,
      },
    });

    if (!run) {
      return Response.json(
        {
          error: "Run not found",
          message: `Run with ID ${id} was not found`,
        },
        { status: 404 },
      );
    }

    if (run.report) {
      const validated = validateAIReport(run.report);
      if (validated) {
        return Response.json(validated);
      }
    }

    const latestRun = runRecordToLatestRun(run);

    const report = await generateAIReport(latestRun);

    await prisma.run.update({
      where: { id },
      data: {
        report: report as Prisma.InputJsonValue,
      },
    });

    return Response.json(report);
  } catch (error) {
    console.error("Failed to generate AI report:", error);
    return Response.json(
      {
        error: "Generation failed",
        message: getErrorMessage(error, "Failed to generate AI report."),
      },
      { status: 500 },
    );
  }
}
