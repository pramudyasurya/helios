import "server-only";

import { prisma } from "@/lib/server/infrastructure/db/prisma";
import {
  createTerminalRunTrailStep,
  appendRunTrailStep,
} from "@/lib/server/infrastructure/runner/trail";

export const STUCK_RUN_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export type ReapedRunResult = {
  reapedRunIds: string[];
  count: number;
};

/**
 * Self-healing watchdog that finds runs stuck in "Running" or "Queued" without updates.
 * If a worker process exits unexpectedly (SIGKILL, OOM, host crash), the run remains
 * in "Running" forever without this reaper.
 */
export async function reapStuckRuns(
  timeoutMs: number = STUCK_RUN_TIMEOUT_MS,
): Promise<ReapedRunResult> {
  const cutoff = new Date(Date.now() - timeoutMs);

  const stuckRuns = await prisma.run.findMany({
    where: {
      status: { in: ["Running", "Queued"] },
      createdAt: { lt: cutoff },
      finishedAt: null,
    },
    select: {
      id: true,
      status: true,
      createdAt: true,
    },
  });
  if (stuckRuns.length === 0) {
    return { reapedRunIds: [], count: 0 };
  }

  const reapedRunIds: string[] = [];

  for (const run of stuckRuns) {
    const finishedAt = new Date().toISOString();
    const summary = `Helios watchdog terminated run: exceeded ${Math.round(timeoutMs / 60000)} minute timeout or worker stopped responding.`;

    const terminalStep = createTerminalRunTrailStep({
      status: "Failed",
      summary,
      timestamp: finishedAt,
    });

    await prisma.run.update({
      where: { id: run.id },
      data: {
        status: "Failed",
        summary,
        finishedAt: new Date(finishedAt),
      },
    });

    try {
      await appendRunTrailStep({
        runId: run.id,
        step: terminalStep,
      });
    } catch {
      // Best-effort trail append; primary run status update already succeeded.
    }

    reapedRunIds.push(run.id);
  }

  return { reapedRunIds, count: reapedRunIds.length };
}
