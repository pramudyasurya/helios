import { describe, expect, it } from "vitest";
import type { LatestRun, RunEvidence } from "@/lib/shared/domain/types";
import { computeRunDiff } from "@/lib/shared/domain/run-comparison";
import { computeFingerprint } from "@/lib/shared/domain/fingerprint";

function makeEvidence(
  id: string,
  type: RunEvidence["type"],
  content: string,
): RunEvidence {
  return {
    id,
    type,
    content,
    pageUrl: "https://example.com",
    capturedAt: "2026-08-01T10:00:00.000Z",
    status: "open",
  };
}

function makeRun(overrides: Partial<LatestRun> = {}): LatestRun {
  return {
    id: "run-1",
    startingUrl: "https://example.com",
    status: "Completed",
    trail: [],
    summary: "",
    checks: [],
    createdAt: "2026-08-01T10:00:00.000Z",
    ...overrides,
  };
}

describe("computeRunDiff issues", () => {
  it("flags fingerprints present only in B as new", () => {
    const a = makeRun({ id: "a", evidence: [] });
    const b = makeRun({
      id: "b",
      evidence: [makeEvidence("ev-1", "console", "TypeError: x is undefined")],
    });

    const diff = computeRunDiff(a, b);

    expect(diff.newIssues).toHaveLength(1);
    expect(diff.newIssues[0]).toMatchObject({
      title: "TypeError: x is undefined",
      type: "console",
      severity: "low",
      evidenceIds: ["ev-1"],
      status: "new",
    });
    expect(diff.newIssues[0].fingerprint).toBeTruthy();
    expect(diff.resolvedIssues).toHaveLength(0);
    expect(diff.recurringIssues).toHaveLength(0);
  });

  it("flags fingerprints present only in A as resolved", () => {
    const a = makeRun({
      id: "a",
      evidence: [makeEvidence("ev-1", "network", "https://api.example.com failed")],
    });
    const b = makeRun({ id: "b", evidence: [] });

    const diff = computeRunDiff(a, b);

    expect(diff.resolvedIssues).toHaveLength(1);
    expect(diff.resolvedIssues[0]).toMatchObject({
      type: "network",
      severity: "medium",
      evidenceIds: ["ev-1"],
      status: "resolved",
    });
    expect(diff.newIssues).toHaveLength(0);
    expect(diff.recurringIssues).toHaveLength(0);
  });

  it("flags fingerprints in both runs as recurring", () => {
    const shared = makeEvidence("ev-a", "console", "TypeError: x is undefined");
    const a = makeRun({ id: "a", evidence: [shared] });
    const b = makeRun({
      id: "b",
      evidence: [makeEvidence("ev-b", "console", "TypeError: x is undefined")],
    });

    const diff = computeRunDiff(a, b);

    expect(diff.recurringIssues).toHaveLength(1);
    expect(diff.recurringIssues[0]).toMatchObject({
      title: "TypeError: x is undefined",
      evidenceIds: ["ev-b"],
      status: "recurring",
    });
    expect(diff.newIssues).toHaveLength(0);
    expect(diff.resolvedIssues).toHaveLength(0);
  });

  it("returns an empty diff when runs are identical", () => {
    const a = makeRun({ id: "a" });
    const b = makeRun({ id: "b" });

    const diff = computeRunDiff(a, b);

    expect(diff.newIssues).toHaveLength(0);
    expect(diff.resolvedIssues).toHaveLength(0);
    expect(diff.recurringIssues).toHaveLength(0);
    expect(diff.metricDeltas.every((m) => m.direction === "unchanged")).toBe(
      true,
    );
  });

  it("groups multiple evidence rows sharing one fingerprint into one issue", () => {
    const b = makeRun({
      id: "b",
      evidence: [
        makeEvidence("ev-1", "console", "TypeError: x is undefined"),
        makeEvidence("ev-2", "console", "TypeError: x is undefined"),
      ],
    });

    const diff = computeRunDiff(makeRun({ id: "a", evidence: [] }), b);

    expect(diff.newIssues).toHaveLength(1);
    expect(diff.newIssues[0].evidenceIds).toEqual(["ev-1", "ev-2"]);
  });

  it("matches persisted issue fingerprints across runs in the same environment", () => {
    const a = makeRun({
      id: "a",
      environmentId: "env-1",
      evidence: [makeEvidence("ev-a", "console", "TypeError: x is undefined")],
    });
    const b = makeRun({
      id: "b",
      environmentId: "env-1",
      evidence: [makeEvidence("ev-b", "console", "TypeError: x is undefined")],
    });

    const diff = computeRunDiff(a, b);

    expect(diff.recurringIssues).toHaveLength(1);
    expect(diff.recurringIssues[0]).toMatchObject({
      title: "TypeError: x is undefined",
      status: "recurring",
    });
    expect(diff.recurringIssues[0].fingerprint).toBe(
      computeFingerprint({
        environmentId: "env-1",
        type: "console",
        message: "TypeError: x is undefined",
      }),
    );
    expect(diff.newIssues).toHaveLength(0);
    expect(diff.resolvedIssues).toHaveLength(0);
  });

  it("keeps identical messages in different environments isolated", () => {
    const a = makeRun({
      id: "a",
      environmentId: "env-1",
      evidence: [makeEvidence("ev-a", "console", "TypeError: x is undefined")],
    });
    const b = makeRun({
      id: "b",
      environmentId: "env-2",
      evidence: [makeEvidence("ev-b", "console", "TypeError: x is undefined")],
    });

    const diff = computeRunDiff(a, b);

    expect(diff.newIssues).toHaveLength(1);
    expect(diff.resolvedIssues).toHaveLength(1);
    expect(diff.recurringIssues).toHaveLength(0);
    expect(diff.newIssues[0].fingerprint).not.toBe(
      diff.resolvedIssues[0].fingerprint,
    );
  });
});

describe("computeRunDiff metrics", () => {
  it("reports signed delta, percentage, and direction", () => {
    const a = makeRun({ id: "a", durationMs: 2000 });
    const b = makeRun({ id: "b", durationMs: 1000 });

    const diff = computeRunDiff(a, b);
    const duration = diff.metricDeltas.find((m) => m.key === "durationMs");

    expect(duration).toMatchObject({
      from: 2000,
      to: 1000,
      delta: -1000,
      percentChange: -50,
      direction: "improved",
    });
  });

  it("yields null percentChange when the baseline is zero", () => {
    const a = makeRun({ id: "a", durationMs: 0 });
    const b = makeRun({ id: "b", durationMs: 500 });

    const diff = computeRunDiff(a, b);
    const duration = diff.metricDeltas.find((m) => m.key === "durationMs");

    expect(duration).toMatchObject({
      from: 0,
      to: 500,
      delta: 500,
      percentChange: null,
      direction: "regressed",
    });
  });

  it("classifies domContentLoadedMs regression by load band", () => {
    const a = makeRun({
      id: "a",
      loadMetrics: { domContentLoadedMs: 800, loadEventMs: 1200 },
    });
    const b = makeRun({
      id: "b",
      loadMetrics: { domContentLoadedMs: 3000, loadEventMs: 3500 },
    });

    const diff = computeRunDiff(a, b);
    const domLoad = diff.metricDeltas.find(
      (m) => m.key === "domContentLoadedMs",
    );

    expect(domLoad).toMatchObject({
      from: 800,
      to: 3000,
      delta: 2200,
      direction: "regressed",
    });
  });

  it("keeps domContentLoadedMs unchanged within the same load band", () => {
    const a = makeRun({
      id: "a",
      loadMetrics: { domContentLoadedMs: 800, loadEventMs: 1200 },
    });
    const b = makeRun({
      id: "b",
      loadMetrics: { domContentLoadedMs: 2000, loadEventMs: 2400 },
    });

    const diff = computeRunDiff(a, b);
    const domLoad = diff.metricDeltas.find(
      (m) => m.key === "domContentLoadedMs",
    );

    expect(domLoad).toMatchObject({
      from: 800,
      to: 2000,
      delta: 1200,
      direction: "unchanged",
    });
  });

  it("treats missing error collections as null rather than zero", () => {
    const a = makeRun({ id: "a", consoleErrors: ["boom"] });
    const b = makeRun({ id: "b" });

    const diff = computeRunDiff(a, b);
    const consoleErrors = diff.metricDeltas.find(
      (m) => m.key === "consoleErrorCount",
    );

    expect(consoleErrors).toMatchObject({
      from: 1,
      to: null,
      delta: null,
      percentChange: null,
      direction: "unchanged",
    });
  });
});
