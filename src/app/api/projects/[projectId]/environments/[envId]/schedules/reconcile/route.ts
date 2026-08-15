import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/infrastructure/db/prisma";
import { getQABoss } from "@/lib/server/infrastructure/queue/qa-jobs";
import { reconcileQARunSchedules } from "@/lib/server/infrastructure/queue/qa-schedule-reconciler";
import { getErrorMessage } from "@/lib/shared/domain/errors";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; envId: string }> },
) {
  try {
    const { projectId, envId } = await params;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 },
      );
    }

    const environment = await prisma.environment.findUnique({
      where: { id: envId },
    });

    if (!environment || environment.projectId !== projectId) {
      return NextResponse.json(
        { error: "Environment not found" },
        { status: 404 },
      );
    }

    const boss = await getQABoss();
    const [result, active] = await Promise.all([
      reconcileQARunSchedules(boss),
      prisma.qaSchedule.count({
        where: { environmentId: environment.id, active: true },
      }),
    ]);

    return NextResponse.json({ data: { ...result, active } });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}
