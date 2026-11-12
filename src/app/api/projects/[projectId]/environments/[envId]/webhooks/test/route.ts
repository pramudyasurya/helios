import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/infrastructure/db/prisma";
import { WebhookConfigSchema } from "@/lib/shared/domain/notifications";
import { dispatchRunAlerts } from "@/lib/server/infrastructure/notifications/webhook-dispatcher";
import { getErrorMessage } from "@/lib/shared/domain/errors";
import type { LatestRun } from "@/lib/shared/domain/types";

function buildSampleTestRun(environmentName: string, baseUrl: string): LatestRun {
  return {
    id: "test-run-synthetic",
    startingUrl: baseUrl || "https://helios-qa.local",
    status: "Completed",
    trail: [
      {
        label: "Helios test alert",
        detail: `Verification ping from environment "${environmentName}"`,
        timestamp: new Date().toISOString(),
      },
    ],
    summary: "Helios synthetic test alert successfully triggered from Webhook Settings.",
    createdAt: new Date().toISOString(),
    durationMs: 950,
    checks: [
      {
        title: "Webhook Connectivity Test",
        detail: "Synthesized check verifying endpoint routing and payload formatting.",
        status: "passed",
        severity: "info",
      },
    ],
    loadMetrics: {
      domContentLoadedMs: 180,
      loadEventMs: 320,
      lcpMs: 640,
      cls: 0.01,
      ttfbMs: 65,
    },
  };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string; envId: string }> },
) {
  try {
    const { projectId, envId } = await params;

    const environment = await prisma.environment.findFirst({
      where: {
        id: envId,
        projectId,
      },
      select: {
        id: true,
        name: true,
        baseUrl: true,
      },
    });

    if (!environment) {
      return NextResponse.json({ error: "Environment not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = WebhookConfigSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid webhook configuration", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const testWebhook = {
      ...parsed.data,
      enabled: true,
      triggers: ["on_every_run"] as ("on_failure" | "on_every_run")[],
    };

    const sampleRun = buildSampleTestRun(environment.name, environment.baseUrl ?? "https://helios-qa.local");

    const [result] = await dispatchRunAlerts(sampleRun, [testWebhook], { timeoutMs: 5000 });

    if (!result) {
      return NextResponse.json(
        { error: "Webhook dispatcher filtered out test event" },
        { status: 400 },
      );
    }

    if (result.status === "rejected") {
      const reason = result.reason instanceof Error ? result.reason.message : String(result.reason);
      return NextResponse.json(
        {
          success: false,
          error: reason,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `Test alert successfully delivered to ${testWebhook.provider} endpoint.`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}
