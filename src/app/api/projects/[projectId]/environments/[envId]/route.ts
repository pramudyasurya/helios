import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/server/infrastructure/db/prisma";
import { unscheduleQARunSchedule } from "@/lib/server/infrastructure/queue/qa-jobs";
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

    const existingStorage =
      existing.storageState && typeof existing.storageState === "object"
        ? (existing.storageState as Record<string, unknown>)
        : {};

    let nextStorageState: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined;
    if (result.data.storageState !== undefined || result.data.webhooks !== undefined) {
      if (result.data.storageState === null && result.data.webhooks === undefined) {
        nextStorageState = Prisma.DbNull;
      } else {
        const baseStorage =
          result.data.storageState === null
            ? {}
            : result.data.storageState !== undefined
              ? (result.data.storageState as Record<string, unknown>)
              : existingStorage;

        const merged = {
          ...baseStorage,
          ...(result.data.webhooks !== undefined
            ? { webhooks: result.data.webhooks }
            : existingStorage.webhooks !== undefined
              ? { webhooks: existingStorage.webhooks }
              : {}),
        };

        nextStorageState = Object.keys(merged).length === 0 ? Prisma.DbNull : (merged as Prisma.InputJsonValue);
      }
    }

    const updated = await prisma.environment.update({
      where: { id: envId },
      data: {
        ...(result.data.name !== undefined ? { name: result.data.name } : {}),
        ...(result.data.baseUrl !== undefined
          ? { baseUrl: result.data.baseUrl }
          : {}),
        ...(nextStorageState !== undefined ? { storageState: nextStorageState } : {}),
      },
      select: {
        id: true,
        projectId: true,
        name: true,
        baseUrl: true,
        storageState: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const { storageState: persistedStorageState, ...environment } = updated;
    const storageObj =
      persistedStorageState && typeof persistedStorageState === "object"
        ? (persistedStorageState as Record<string, unknown>)
        : null;
    const webhooks = (storageObj?.webhooks ?? []) as unknown[];

    return NextResponse.json({
      ...environment,
      hasStorageState: Boolean(persistedStorageState),
      webhooks,
    });
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

    const schedules = await prisma.qaSchedule.findMany({
      where: { environmentId: envId },
      select: { id: true },
    });

    for (const schedule of schedules) {
      await unscheduleQARunSchedule(schedule.id);
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
