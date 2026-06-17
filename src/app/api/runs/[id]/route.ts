import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

import { runRecordToLatestRun } from "@/lib/helios/server/run-record";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const run = await prisma.run.findUnique({
      where: { id },
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
        message:
          error instanceof Error ? error.message : "Failed to retrieve run.",
      },
      { status: 500 },
    );
  }
}
