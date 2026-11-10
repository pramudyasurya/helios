import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/infrastructure/db/prisma";
import { UpdateIssueStatusSchema } from "@/lib/shared/domain/validators";
import { getErrorMessage } from "@/lib/shared/domain/errors";

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ projectId: string; envId: string; issueId: string }>;
  },
) {
  try {
    const { projectId, envId, issueId } = await params;
    const body = await request.json();
    const result = UpdateIssueStatusSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 },
      );
    }

    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
      include: { environment: true },
    });

    if (
      !issue ||
      issue.environmentId !== envId ||
      issue.environment.projectId !== projectId
    ) {
      return NextResponse.json(
        { error: "Issue not found" },
        { status: 404 },
      );
    }

    const updated = await prisma.issue.update({
      where: { id: issueId },
      data: {
        status: result.data.status,
        ...(result.data.status === "resolved"
          ? { resolvedBy: "manual" }
          : result.data.status === "open"
            ? { resolvedBy: null, resolvedAtRunId: null }
            : {}),
      },
    });

    return NextResponse.json({ issue: updated });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}
