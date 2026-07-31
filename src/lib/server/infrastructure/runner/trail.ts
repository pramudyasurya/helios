import "server-only";
import { prisma } from "@/lib/server/infrastructure/db/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { TrailStep } from "@/lib/shared/domain/types";

export type RunTrailStepInput = {
  label: string;
  detail: string;
  timestamp?: string;
};

export function getRunTimestamp(startedAt: Date, offsetMs: number) {
  return new Date(startedAt.getTime() + offsetMs).toISOString();
}

export function createTrailStep({
  label,
  detail,
  timestamp,
}: RunTrailStepInput): TrailStep {
  return {
    label,
    detail,
    timestamp: timestamp ?? new Date().toISOString(),
  };
}

export function createTerminalRunTrailStep({
  status,
  summary,
  timestamp,
}: {
  status: "Completed" | "Failed";
  summary: string;
  timestamp: string;
}): TrailStep {
  return createTrailStep({
    label: status === "Completed" ? "Run completed" : "Run failed",
    detail: summary,
    timestamp,
  });
}

export function getTerminalRunOutcome({
  totalPages,
  failedPages,
}: {
  totalPages: number;
  failedPages: number;
}): { status: "Completed" | "Failed"; summary: string } {
  if (failedPages === totalPages) {
    return {
      status: "Failed",
      summary: `Helios could not complete QA for any of ${totalPages} page(s).`,
    };
  }

  if (failedPages === 0) {
    return {
      status: "Completed",
      summary: `Helios completed QA for ${totalPages} page(s).`,
    };
  }

  return {
    status: "Completed",
    summary: `Helios completed QA for ${totalPages} page(s) with ${failedPages} failed page(s).`,
  };
}

export function isValidTrailStep(step: unknown): step is TrailStep {
  if (!step || typeof step !== "object") return false;
  const s = step as Record<string, unknown>;
  return (
    typeof s.label === "string" &&
    typeof s.detail === "string" &&
    typeof s.timestamp === "string"
  );
}

export function sanitizeTrailSteps(steps: unknown[]): TrailStep[] {
  if (!Array.isArray(steps)) return [];
  return steps.filter(isValidTrailStep);
}

const EMBEDDED_URL_REGEX = /https?:\/\/[^\s<>"'\),;]+/gi;

export function formatDisplayUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    parsed.username = "";
    parsed.password = "";
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return rawUrl.split("?")[0].split("#")[0];
  }
}

export function redactEmbeddedUrls(text: string): string {
  if (!text) return text;
  return text.replace(EMBEDDED_URL_REGEX, (match) => {
    try {
      const parsed = new URL(match);
      return parsed.hostname === "." ? match : formatDisplayUrl(match);
    } catch {
      return match;
    }
  });
}

export const DEFAULT_MAX_TRAIL_STEPS = 50;

export function boundTrailSteps(
  steps: TrailStep[],
  maxSteps: number = DEFAULT_MAX_TRAIL_STEPS,
): TrailStep[] {
  const cleanSteps = sanitizeTrailSteps(steps);
  if (cleanSteps.length <= maxSteps) {
    return cleanSteps;
  }
  const firstStep = cleanSteps[0];
  const tailSteps = cleanSteps.slice(cleanSteps.length - (maxSteps - 1));
  return [firstStep, ...tailSteps];
}

export async function appendRunTrailStep({
  runId,
  step,
  maxSteps = DEFAULT_MAX_TRAIL_STEPS,
}: {
  runId: string;
  step: RunTrailStepInput;
  maxSteps?: number;
}): Promise<TrailStep[]> {
  const newStep = createTrailStep(step);
  const existingRun = await prisma.run.findUnique({
    where: { id: runId },
    select: { trail: true },
  });

  const rawTrail = Array.isArray(existingRun?.trail)
    ? (existingRun.trail as unknown[])
    : [];

  const existingTrail = sanitizeTrailSteps(rawTrail);
  const newTrail = boundTrailSteps([...existingTrail, newStep], maxSteps);

  await prisma.run.update({
    where: { id: runId },
    data: {
      trail: newTrail as unknown as Prisma.InputJsonValue,
    },
  });

  return newTrail;
}
