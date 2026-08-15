import type {
  CheckSeverity,
  EvidenceType,
  LatestRun,
} from "@/lib/shared/domain/types";
import {
  computeFingerprint,
  deriveSeverity,
  normalizeMessage,
} from "@/lib/shared/domain/fingerprint";
import { getDomLoadStatus } from "@/lib/shared/domain/performance";

export type IssueDiff = {
  fingerprint: string;
  title: string;
  type: EvidenceType;
  severity: CheckSeverity;
  evidenceIds: string[];
  status: "new" | "recurring" | "resolved";
};

export type MetricDelta = {
  key: string;
  label: string;
  from: number | null;
  to: number | null;
  delta: number | null;
  percentChange: number | null;
  direction: "improved" | "regressed" | "unchanged";
};

export type RunComparison = {
  runA: { id: string; createdAt: string };
  runB: { id: string; createdAt: string };
  newIssues: IssueDiff[];
  resolvedIssues: IssueDiff[];
  recurringIssues: IssueDiff[];
  metricDeltas: MetricDelta[];
};

type IssueRecord = {
  fingerprint: string;
  title: string;
  type: EvidenceType;
  severity: CheckSeverity;
  evidenceIds: string[];
};

/**
 * Fingerprint scope mirrors fingerprint-issues.ts: env-backed runs key on the
 * environment id so compare fingerprints match persisted Issue fingerprints,
 * while env-less ad-hoc runs fall back to startingUrl to stay isolated by URL.
 */
function collectIssues(run: LatestRun): Map<string, IssueRecord> {
  const scope = run.environmentId ?? run.startingUrl;
  const byFingerprint = new Map<string, IssueRecord>();

  for (const evidence of run.evidence ?? []) {
    const fingerprint = computeFingerprint({
      environmentId: scope,
      type: evidence.type,
      message: evidence.content,
    });

    const existing = byFingerprint.get(fingerprint);
    if (existing) {
      existing.evidenceIds.push(evidence.id);
      continue;
    }

    byFingerprint.set(fingerprint, {
      fingerprint,
      title: normalizeMessage(evidence.content),
      type: evidence.type,
      severity: deriveSeverity(evidence.type),
      evidenceIds: [evidence.id],
    });
  }

  return byFingerprint;
}

function sortByFingerprint(issues: IssueDiff[]): IssueDiff[] {
  return issues.sort((x, y) => x.fingerprint.localeCompare(y.fingerprint));
}

type Direction = MetricDelta["direction"];

function metricDelta(
  key: string,
  label: string,
  from: number | null,
  to: number | null,
  resolveDirection: (from: number | null, to: number | null) => Direction,
): MetricDelta {
  const delta = from !== null && to !== null ? to - from : null;
  const percentChange =
    from !== null && to !== null && from !== 0
      ? ((to - from) / from) * 100
      : null;

  return {
    key,
    label,
    from,
    to,
    delta,
    percentChange,
    direction: resolveDirection(from, to),
  };
}

function lowerIsBetterDirection(
  from: number | null,
  to: number | null,
): Direction {
  if (from === null || to === null || from === to) return "unchanged";
  return to < from ? "improved" : "regressed";
}

const DOM_LOAD_RANK: Record<string, number> = { Fast: 1, Moderate: 2, Slow: 3 };

function domLoadDirection(from: number | null, to: number | null): Direction {
  if (from === null || to === null) return "unchanged";
  const fromRank = DOM_LOAD_RANK[getDomLoadStatus(from).label];
  const toRank = DOM_LOAD_RANK[getDomLoadStatus(to).label];
  if (fromRank === toRank) return "unchanged";
  return toRank < fromRank ? "improved" : "regressed";
}

function countOrNull(values: string[] | undefined): number | null {
  return values === undefined ? null : values.length;
}

function computeMetricDeltas(a: LatestRun, b: LatestRun): MetricDelta[] {
  return [
    metricDelta(
      "durationMs",
      "Duration",
      a.durationMs ?? null,
      b.durationMs ?? null,
      lowerIsBetterDirection,
    ),
    metricDelta(
      "domContentLoadedMs",
      "DOM Content Loaded",
      a.loadMetrics?.domContentLoadedMs ?? null,
      b.loadMetrics?.domContentLoadedMs ?? null,
      domLoadDirection,
    ),
    metricDelta(
      "consoleErrorCount",
      "Console Errors",
      countOrNull(a.consoleErrors),
      countOrNull(b.consoleErrors),
      lowerIsBetterDirection,
    ),
    metricDelta(
      "failedRequestCount",
      "Failed Requests",
      countOrNull(a.failedRequests),
      countOrNull(b.failedRequests),
      lowerIsBetterDirection,
    ),
    metricDelta(
      "brokenImageCount",
      "Broken Images",
      countOrNull(a.brokenImages),
      countOrNull(b.brokenImages),
      lowerIsBetterDirection,
    ),
  ];
}

export function computeRunDiff(a: LatestRun, b: LatestRun): RunComparison {
  const issuesA = collectIssues(a);
  const issuesB = collectIssues(b);

  const newIssues: IssueDiff[] = [];
  const resolvedIssues: IssueDiff[] = [];
  const recurringIssues: IssueDiff[] = [];

  for (const [fingerprint, issue] of issuesB) {
    if (issuesA.has(fingerprint)) {
      recurringIssues.push({ ...issue, status: "recurring" });
    } else {
      newIssues.push({ ...issue, status: "new" });
    }
  }

  for (const [fingerprint, issue] of issuesA) {
    if (!issuesB.has(fingerprint)) {
      resolvedIssues.push({ ...issue, status: "resolved" });
    }
  }

  return {
    runA: { id: a.id, createdAt: a.createdAt },
    runB: { id: b.id, createdAt: b.createdAt },
    newIssues: sortByFingerprint(newIssues),
    resolvedIssues: sortByFingerprint(resolvedIssues),
    recurringIssues: sortByFingerprint(recurringIssues),
    metricDeltas: computeMetricDeltas(a, b),
  };
}
