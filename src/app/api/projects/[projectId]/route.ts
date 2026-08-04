import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/infrastructure/db/prisma";
import { UpdateProjectSchema } from "@/lib/shared/domain/validators";
import { getErrorMessage } from "@/lib/shared/domain/errors";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        environments: {
          orderBy: { name: "asc" },
          include: {
            runs: {
              orderBy: { createdAt: "desc" },
              take: 1,
              select: {
                id: true,
                status: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Compute stats across linked runs
    const envIds = project.environments.map((e) => e.id);

    const totalRuns = await prisma.run.count({
      where: {
        environmentId: { in: envIds },
      },
    });

    const passedRuns = await prisma.run.count({
      where: {
        environmentId: { in: envIds },
        status: { equals: "Completed", mode: "insensitive" },
      },
    });

    const failedRuns = await prisma.run.count({
      where: {
        environmentId: { in: envIds },
        status: { equals: "Failed", mode: "insensitive" },
      },
    });

    const lastRun = await prisma.run.findFirst({
      where: { environmentId: { in: envIds } },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });

    const passRate = totalRuns > 0 ? Math.round((passedRuns / totalRuns) * 1000) / 10 : 0;

    const formattedEnvironments = project.environments.map((env) => {
      const lastEnvRun = env.runs[0];
      return {
        id: env.id,
        projectId: env.projectId,
        name: env.name,
        baseUrl: env.baseUrl,
        createdAt: env.createdAt,
        updatedAt: env.updatedAt,
        lastRunStatus: lastEnvRun ? lastEnvRun.status : null,
        lastRunAt: lastEnvRun ? lastEnvRun.createdAt : null,
      };
    });

    return NextResponse.json({
      ...project,
      environments: formattedEnvironments,
      stats: {
        totalRuns,
        passedRuns,
        failedRuns,
        passRate,
        lastRunAt: lastRun?.createdAt || null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const body = await request.json();
    const result = UpdateProjectSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 },
      );
    }

    const existing = await prisma.project.findUnique({ where: { id: projectId } });
    if (!existing) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(result.data.name ? { name: result.data.name } : {}),
      },
      include: {
        environments: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A project with this name already exists." },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;

    const existing = await prisma.project.findUnique({ where: { id: projectId } });
    if (!existing) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    await prisma.project.delete({ where: { id: projectId } });

    return NextResponse.json({ success: true, deletedId: projectId });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}
