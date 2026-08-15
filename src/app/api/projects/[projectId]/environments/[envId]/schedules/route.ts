import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/infrastructure/db/prisma";
import {
  scheduleQARunSchedule,
  unscheduleQARunSchedule,
} from "@/lib/server/infrastructure/queue/qa-jobs";
import { applyCronJitter, nextRunAt } from "@/lib/shared/domain/cron";
import { getErrorMessage } from "@/lib/shared/domain/errors";
import type { ScheduleMode, QaScheduleView } from "@/lib/shared/domain/types";
import { CreateScheduleSchema } from "@/lib/shared/domain/validators";
import type { QaSchedule } from "@/generated/prisma/client";

const MAX_ACTIVE_SCHEDULES_PER_ENV = 10;

export function toScheduleView(schedule: QaSchedule): QaScheduleView {
  return {
    id: schedule.id,
    environmentId: schedule.environmentId,
    cronExpression: schedule.cronExpression,
    timezone: schedule.timezone,
    mode: schedule.mode as ScheduleMode,
    routes: schedule.routes,
    maxPages: schedule.maxPages,
    maxDepth: schedule.maxDepth,
    active: schedule.active,
    lastFiredAt: schedule.lastFiredAt
      ? schedule.lastFiredAt.toISOString()
      : null,
    nextRunAt: schedule.active
      ? nextRunAt(schedule.cronExpression, schedule.timezone)
      : null,
    createdAt: schedule.createdAt.toISOString(),
    updatedAt: schedule.updatedAt.toISOString(),
  };
}

export async function POST(
  request: Request,
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

    if (!environment.baseUrl) {
      return NextResponse.json(
        { error: "Environment has no base URL configured" },
        { status: 400 },
      );
    }

    const activeScheduleCount = await prisma.qaSchedule.count({
      where: { environmentId: environment.id, active: true },
    });

    if (activeScheduleCount >= MAX_ACTIVE_SCHEDULES_PER_ENV) {
      return NextResponse.json(
        {
          error: "Schedule limit reached",
          message: `Each environment supports at most ${MAX_ACTIVE_SCHEDULES_PER_ENV} active schedules.`,
        },
        { status: 400 },
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

    const result = CreateScheduleSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 },
      );
    }

    const { timezone, mode, routes, maxPages, maxDepth, active } =
      result.data;
    const cronExpression = applyCronJitter(
      result.data.cronExpression,
      environment.id,
    );

    const scheduleId = randomUUID();

    if (active) {
      await scheduleQARunSchedule({
        id: scheduleId,
        cronExpression,
        timezone,
      });
    }

    let schedule: QaSchedule;
    try {
      schedule = await prisma.qaSchedule.create({
        data: {
          id: scheduleId,
          environmentId: environment.id,
          cronExpression,
          timezone,
          mode,
          routes,
          maxPages,
          maxDepth,
          active,
        },
      });
    } catch (error) {
      if (active) {
        try {
          await unscheduleQARunSchedule(scheduleId);
        } catch (unscheduleError) {
          console.error(
            "Failed to clean up schedule registration after create failure:",
            unscheduleError,
          );
        }
      }
      throw error;
    }

    return NextResponse.json({ data: toScheduleView(schedule) }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}

export async function GET(
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

    const schedules = await prisma.qaSchedule.findMany({
      where: { environmentId: environment.id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ data: schedules.map(toScheduleView) });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}
