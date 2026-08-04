import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/infrastructure/db/prisma";
import { UpdateEnvironmentSchema } from "@/lib/shared/domain/validators";
import { getErrorMessage, uniqueConstraintResponse } from "@/lib/shared/domain/errors";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string; envId: string }> },
) {
  try {
    const { projectId, envId } = await params;
    const body = await request.json();
    const result = UpdateEnvironmentSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 },
      );
    }

    const existing = await prisma.environment.findUnique({
      where: { id: envId },
    });

    if (!existing || existing.projectId !== projectId) {
      return NextResponse.json(
        { error: "Environment not found" },
        { status: 404 },
      );
    }

    const updated = await prisma.environment.update({
      where: { id: envId },
      data: {
        ...(result.data.name !== undefined ? { name: result.data.name } : {}),
        ...(result.data.baseUrl !== undefined
          ? { baseUrl: result.data.baseUrl }
          : {}),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    const uniqueConflict = uniqueConstraintResponse(
      error,
      "An environment with this name already exists in this project.",
      409,
    );
    if (uniqueConflict) return uniqueConflict;
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; envId: string }> },
) {
  try {
    const { projectId, envId } = await params;

    const existing = await prisma.environment.findUnique({
      where: { id: envId },
    });

    if (!existing || existing.projectId !== projectId) {
      return NextResponse.json(
        { error: "Environment not found" },
        { status: 404 },
      );
    }

    await prisma.environment.delete({ where: { id: envId } });

    return NextResponse.json({ success: true, deletedId: envId });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}
