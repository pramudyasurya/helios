import "server-only";

import { prisma } from "@/lib/server/infrastructure/db/prisma";
import {
  computeFingerprint,
  deriveSeverity,
  normalizeEvidenceMessage,
} from "@/lib/shared/domain/fingerprint";
import type { EvidenceType } from "@/lib/shared/domain/types";

type EvidenceGroup = {
  type: EvidenceType;
  normalizedMessage: string;
  evidenceIds: string[];
};

/**
 * Volume cap: at most 500 distinct fingerprints are fingerprinted per run.
 * Evidence beyond the first 500 distinct fingerprints is skipped, bounding the
 * sequential upsert loop; duplicates of an already-captured fingerprint still
 * join their group.
 */
const MAX_DISTINCT_FINGERPRINTS_PER_RUN = 500;

/**
 * Fingerprints a completed run's evidence into Issue + RunIssue rows.
 *
 * Idempotency contract: `Issue.fingerprint` and `RunIssue.@@unique([runId, issueId])`
 * make replays safe. `occurrences` counts runs that observed the issue, so it is
 * incremented only when a *new* RunIssue link is created and the issue was already
 * known (the first-seen run is already covered by the Issue's default `occurrences: 1`).
 *
 * Best-effort: throws on DB errors so the caller can log and keep the run authoritative.
 */
export async function fingerprintRunIssues(runId: string): Promise<void> {
  const run = await prisma.run.findUnique({
    where: { id: runId },
    select: {
      environmentId: true,
      evidence: { select: { id: true, type: true, content: true } },
    },
  });

  if (!run || run.environmentId === null || run.evidence.length === 0) {
    return;
  }

  const environmentId = run.environmentId;
  const groups = new Map<string, EvidenceGroup>();

  for (const evidence of run.evidence) {
    const fingerprint = computeFingerprint({
      environmentId,
      type: evidence.type,
      message: evidence.content,
    });
    const existing = groups.get(fingerprint);
    if (existing) {
      existing.evidenceIds.push(evidence.id);
    } else if (groups.size < MAX_DISTINCT_FINGERPRINTS_PER_RUN) {
      groups.set(fingerprint, {
        type: evidence.type,
        normalizedMessage: normalizeEvidenceMessage(
          evidence.type,
          evidence.content,
        ),
        evidenceIds: [evidence.id],
      });
    }
  }

  const currentFingerprints = [...groups.keys()];

  for (const [fingerprint, group] of groups) {
    const issue = await prisma.issue.upsert({
      where: { fingerprint },
      create: {
        fingerprint,
        environmentId,
        type: group.type,
        normalizedMessage: group.normalizedMessage,
        firstSeenRunId: runId,
        lastSeenRunId: runId,
      },
      update: {
        lastSeenRunId: runId,
        // A re-observed issue is no longer resolved; triage status is untouched.
        resolvedBy: null,
        resolvedAtRunId: null,
      },
    });

    const status = issue.firstSeenRunId === runId ? "new" : "recurring";

    const existingLink = await prisma.runIssue.findUnique({
      where: { runId_issueId: { runId, issueId: issue.id } },
      select: { id: true },
    });

    if (existingLink) {
      await prisma.runIssue.update({
        where: { id: existingLink.id },
        data: {
          severity: deriveSeverity(group.type),
          evidenceIds: group.evidenceIds,
          status,
        },
      });
    } else {
      await prisma.runIssue.create({
        data: {
          runId,
          issueId: issue.id,
          severity: deriveSeverity(group.type),
          evidenceIds: group.evidenceIds,
          status,
        },
      });
      if (issue.firstSeenRunId !== runId) {
        await prisma.issue.update({
          where: { id: issue.id },
          data: { occurrences: { increment: 1 } },
        });
      }
    }
  }

  await prisma.issue.updateMany({
    where: {
      environmentId,
      fingerprint: { notIn: currentFingerprints },
      lastSeenRunId: { not: runId },
      resolvedAtRunId: null,
    },
    data: {
      resolvedBy: "auto",
      resolvedAtRunId: runId,
    },
  });
}
