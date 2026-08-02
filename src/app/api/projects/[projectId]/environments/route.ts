import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/infrastructure/db/prisma";
import { CreateEnvironmentSchema } from "@/lib/shared/domain/validators";
import { getErrorMessage } from "@/lib/shared/domain/errors";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const result = CreateEnvironmentSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { name, baseUrl } = result.data;

    const existing = await prisma.environment.findUnique({
      where: {
        projectId_name: {
          projectId,
          name,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Environment with this name already exists in project" },
        { status: 409 }
      );
    }

    const environment = await prisma.environment.create({
      data: {
        projectId,
        name,
        baseUrl: baseUrl || null,
      },
    });

    return NextResponse.json(environment, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
