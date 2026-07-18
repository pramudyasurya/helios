import { Prisma } from "@/generated/prisma/client";
import { type EvidenceStatus } from "@/lib/shared/domain/types";
import { prisma } from "@/lib/server/infrastructure/db/prisma";
import { NextResponse } from "next/server";
import { UpdateEvidenceStatusSchema } from "@/lib/shared/domain/validators";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; evidenceId: string }> },
) {
  const { id, evidenceId } = await params;

  let body: { status?: unknown };

  try {
    body = await request.json();
  } catch (error) {
    console.error("Error parsing request body:", error);
    return NextResponse.json(
      { error: "Failed to parse request body" },
      { status: 400 },
    );
  }

  const validation = UpdateEvidenceStatusSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      {
        error: "Invalid status",
        message:
          validation.error.issues[0]?.message || "Invalid evidence status.",
        details: validation.error.issues,
      },
      { status: 400 },
    );
  }

  try {
    const updatedEvidence = await prisma.evidence.update({
      where: {
        id: evidenceId,
        runId: id,
      },
      data: {
        status: validation.data.status as EvidenceStatus,
      },
    });

    return NextResponse.json(updatedEvidence);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Evidence not found or unauthorized" },
        { status: 404 },
      );
    }

    console.error("Error updating evidence status:", error);
    return NextResponse.json(
      { error: "Failed to update evidence status" },
      { status: 500 },
    );
  }
}
