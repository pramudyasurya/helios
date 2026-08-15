import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/infrastructure/db/prisma";
import {
  scheduleQARunSchedule,
  unscheduleQARunSchedule,
} from "@/lib/server/infrastructure/queue/qa-jobs";
import { applyCronJitter } from "@/lib/shared/domain/cron";
import { getErrorMessage } from "@/lib/shared/domain/errors";
import { UpdateScheduleSchema } from "@/lib/shared/domain/validators";
import { toScheduleView } from "../route";
import type { QaSchedule } from "@/generated/prisma/client";

export async function PATCH(
  request: Request,
  {
    params,
  }: { params: Promise<{ projectId: string; envId: string; scheduleId: string }> },
) {
  try {
    const { projectId, envId, scheduleId } = await params;

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

    const schedule = await prisma.qaSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule || schedule.environmentId !== environment.id) {
      return NextResponse.json(
        { error: "Schedule not found" },
        { status: 404 },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON", message: "Please submit a valid JSON body." },
        { status: 400 },
      );
    }

    const result = UpdateScheduleSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 },
      );
    }

    const { timezone, mode, routes, maxPages, maxDepth, active } = result.data;
    const cronExpression =
      result.data.cronExpression !== undefined
        ? applyCronJitter(result.data.cronExpression, environment.id)
        : schedule.cronExpression;
    const cronChanged = cronExpression !== schedule.cronExpression;
    const tzChanged =
      timezone !== undefined && timezone !== schedule.timezone;

    const nextActive = active ?? schedule.active;
    const nextTimezone = timezone ?? schedule.timezone;
    const needsSchedule =
      nextActive && (cronChanged || tzChanged || !schedule.active);
    const needsUnschedule = !nextActive && schedule.active;

    if (needsSchedule) {
      await scheduleQARunSchedule({
        id: schedule.id,
        cronExpression,
        timezone: nextTimezone,
      });
    } else if (needsUnschedule) {
      await unscheduleQARunSchedule(schedule.id);
    }

    let updated: QaSchedule;
    try {
      updated = await prisma.qaSchedule.update({
        where: { id: schedule.id },
        data: {
          ...(result.data.cronExpression !== undefined
            ? { cronExpression }
            : {}),
          ...(timezone !== undefined ? { timezone } : {}),
          ...(mode !== undefined ? { mode } : {}),
          ...(routes !== undefined ? { routes } : {}),
          ...(maxPages !== undefined ? { maxPages } : {}),
          ...(maxDepth !== undefined ? { maxDepth } : {}),
          ...(active !== undefined ? { active } : {}),
        },
      });
    } catch (error) {
      if (needsSchedule || needsUnschedule) {
        try {
          if (schedule.active) {
            await scheduleQARunSchedule({
              id: schedule.id,
              cronExpression: schedule.cronExpression,
              timezone: schedule.timezone,
            });
          } else {
            await unscheduleQARunSchedule(schedule.id);
          }
        } catch (revertError) {
          console.error(
            `[Schedule ${schedule.id}] Failed to revert pg-boss registration after update failure:`,
            revertError,
          );
        }
      }
      throw error;
    }

    return NextResponse.json({ data: toScheduleView(updated) });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  {
    params,
  }: { params: Promise<{ projectId: string; envId: string; scheduleId: string }> },
) {
  try {
    const { projectId, envId, scheduleId } = await params;

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

    const schedule = await prisma.qaSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule || schedule.environmentId !== environment.id) {
      return NextResponse.json(
        { error: "Schedule not found" },
        { status: 404 },
      );
    }

    await unscheduleQARunSchedule(schedule.id);
    await prisma.qaSchedule.delete({ where: { id: schedule.id } });

    return NextResponse.json({
      success: true,
      deletedId: schedule.id,
    });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}
