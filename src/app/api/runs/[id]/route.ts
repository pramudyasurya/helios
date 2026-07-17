import { prisma } from "@/lib/server/infrastructure/db/prisma";
import { revalidateTag } from "next/cache";

import { runRecordToLatestRun } from "@/lib/server/infrastructure/runner/run-record";
import { getErrorMessage } from "@/lib/shared/domain/errors";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const run = await prisma.run.findUnique({
      where: { id },
      include: { evidence: true },
    });

    if (!run) {
      return Response.json(
        { error: "Not found", message: `Run with ID ${id} was not found` },
        { status: 404 },
      );
    }

    return Response.json(runRecordToLatestRun(run));
  } catch (error) {
    return Response.json(
      {
        error: "Database error",
        message: getErrorMessage(error, "Failed to retrieve run."),
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    await prisma.run.deleteMany({
      where: { id },
    });
    revalidateTag("run-stats", "max");

    return new Response(null, { status: 204 });
  } catch (error) {
    return Response.json(
      {
        error: "Database error",
        message: getErrorMessage(error, "Failed to delete run."),
      },
      { status: 500 },
    );
  }
}
