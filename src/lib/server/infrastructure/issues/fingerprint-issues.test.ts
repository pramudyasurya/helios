import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  run: { findUnique: vi.fn() },
  issue: { upsert: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  runIssue: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
}));

vi.mock("@/lib/server/infrastructure/db/prisma", () => ({ prisma: prismaMock }));

import { fingerprintRunIssues } from "@/lib/server/infrastructure/issues/fingerprint-issues";
import { computeFingerprint } from "@/lib/shared/domain/fingerprint";

const consoleEvidence = (id: string, content: string) => ({
  id,
  type: "console" as const,
  content,
});

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.run.findUnique.mockResolvedValue({
    environmentId: "env-1",
    evidence: [],
  });
  prismaMock.issue.upsert.mockResolvedValue({});
  prismaMock.issue.update.mockResolvedValue({});
  prismaMock.issue.updateMany.mockResolvedValue({ count: 0 });
  prismaMock.runIssue.findUnique.mockResolvedValue(null);
  prismaMock.runIssue.update.mockResolvedValue({});
  prismaMock.runIssue.create.mockResolvedValue({});
});

describe("fingerprintRunIssues", () => {
  it("skips env-less runs without writing issues", async () => {
    prismaMock.run.findUnique.mockResolvedValue({
      environmentId: null,
      evidence: [consoleEvidence("e-1", "Error: foo")],
    });

    await fingerprintRunIssues("run-1");

    expect(prismaMock.issue.upsert).not.toHaveBeenCalled();
    expect(prismaMock.runIssue.create).not.toHaveBeenCalled();
  });

  it("skips runs with zero evidence", async () => {
    prismaMock.run.findUnique.mockResolvedValue({
      environmentId: "env-1",
      evidence: [],
    });

    await fingerprintRunIssues("run-1");

    expect(prismaMock.issue.upsert).not.toHaveBeenCalled();
    expect(prismaMock.runIssue.create).not.toHaveBeenCalled();
  });

  it("upserts the Issue and creates a 'new' RunIssue link on first sight", async () => {
    prismaMock.run.findUnique.mockResolvedValue({
      environmentId: "env-1",
      evidence: [consoleEvidence("e-1", "Error: foo")],
    });
    prismaMock.issue.upsert.mockResolvedValue({
      id: "issue-1",
      firstSeenRunId: "run-1",
    });

    await fingerprintRunIssues("run-1");

    expect(prismaMock.issue.upsert).toHaveBeenCalledWith({
      where: { fingerprint: expect.any(String) },
      create: expect.objectContaining({
        environmentId: "env-1",
        type: "console",
        normalizedMessage: "Error: foo",
        firstSeenRunId: "run-1",
        lastSeenRunId: "run-1",
      }),
      update: {
        lastSeenRunId: "run-1",
        resolvedBy: null,
        resolvedAtRunId: null,
      },
    });
    expect(prismaMock.runIssue.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        runId: "run-1",
        issueId: "issue-1",
        severity: "low",
        evidenceIds: ["e-1"],
        status: "new",
      }),
    });
    expect(prismaMock.issue.update).not.toHaveBeenCalled();
  });

  it("groups multiple evidence rows into a single Issue with all evidence ids", async () => {
    prismaMock.run.findUnique.mockResolvedValue({
      environmentId: "env-1",
      evidence: [
        consoleEvidence("e-1", "Error: foo"),
        consoleEvidence("e-2", "Error: foo"),
      ],
    });
    prismaMock.issue.upsert.mockResolvedValue({
      id: "issue-1",
      firstSeenRunId: "run-1",
    });

    await fingerprintRunIssues("run-1");

    expect(prismaMock.issue.upsert).toHaveBeenCalledTimes(1);
    expect(prismaMock.runIssue.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ evidenceIds: ["e-1", "e-2"] }),
    });
  });

  it("labels a known issue 'recurring' and increments occurrences only on link create", async () => {
    prismaMock.run.findUnique.mockResolvedValue({
      environmentId: "env-1",
      evidence: [consoleEvidence("e-1", "Error: foo")],
    });
    prismaMock.issue.upsert.mockResolvedValue({
      id: "issue-1",
      firstSeenRunId: "run-0",
    });

    await fingerprintRunIssues("run-1");

    expect(prismaMock.runIssue.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ status: "recurring" }),
    });
    expect(prismaMock.issue.update).toHaveBeenCalledWith({
      where: { id: "issue-1" },
      data: { occurrences: { increment: 1 } },
    });
  });

  it("refreshes an existing link under replay without incrementing occurrences", async () => {
    prismaMock.run.findUnique.mockResolvedValue({
      environmentId: "env-1",
      evidence: [consoleEvidence("e-1", "Error: foo")],
    });
    prismaMock.issue.upsert.mockResolvedValue({
      id: "issue-1",
      firstSeenRunId: "run-1",
    });
    prismaMock.runIssue.findUnique.mockResolvedValue({ id: "link-1" });

    await fingerprintRunIssues("run-1");

    expect(prismaMock.runIssue.update).toHaveBeenCalledWith({
      where: { id: "link-1" },
      data: {
        severity: "low",
        evidenceIds: ["e-1"],
        status: "new",
      },
    });
    expect(prismaMock.runIssue.create).not.toHaveBeenCalled();
    expect(prismaMock.issue.update).not.toHaveBeenCalled();
  });

  it("records absence of previously-seen issues without flipping triage status", async () => {
    const presentFingerprint = computeFingerprint({
      environmentId: "env-1",
      type: "console",
      message: "Error: foo",
    });
    prismaMock.run.findUnique.mockResolvedValue({
      environmentId: "env-1",
      evidence: [consoleEvidence("e-1", "Error: foo")],
    });
    prismaMock.issue.upsert.mockResolvedValue({
      id: "issue-1",
      firstSeenRunId: "run-1",
    });

    await fingerprintRunIssues("run-1");

    expect(prismaMock.issue.updateMany).toHaveBeenCalledWith({
      where: {
        environmentId: "env-1",
        fingerprint: { notIn: [presentFingerprint] },
        lastSeenRunId: { not: "run-1" },
        resolvedAtRunId: null,
      },
      data: {
        resolvedBy: "auto",
        resolvedAtRunId: "run-1",
      },
    });
  });

  it("clears auto-resolution when a re-observed issue comes back", async () => {
    prismaMock.run.findUnique.mockResolvedValue({
      environmentId: "env-1",
      evidence: [consoleEvidence("e-1", "Error: foo")],
    });
    // Issue was auto-resolved at run 2; re-observed at run 3.
    prismaMock.issue.upsert.mockResolvedValue({
      id: "issue-1",
      firstSeenRunId: "run-2",
    });

    await fingerprintRunIssues("run-3");

    expect(prismaMock.issue.upsert).toHaveBeenCalledWith({
      where: { fingerprint: expect.any(String) },
      create: expect.objectContaining({
        environmentId: "env-1",
        firstSeenRunId: "run-3",
      }),
      update: {
        lastSeenRunId: "run-3",
        resolvedBy: null,
        resolvedAtRunId: null,
      },
    });
    expect(prismaMock.issue.update).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: expect.anything() }),
      }),
    );
  });

  it("caps per-run fingerprinting at 500 distinct fingerprints", async () => {
    const evidence = Array.from({ length: 600 }, (_, i) =>
      consoleEvidence(`e-${i}`, `Error: unique-${i}`),
    );
    prismaMock.run.findUnique.mockResolvedValue({
      environmentId: "env-1",
      evidence,
    });
    prismaMock.issue.upsert.mockResolvedValue({
      id: "issue-1",
      firstSeenRunId: "run-1",
    });

    await fingerprintRunIssues("run-1");

    expect(prismaMock.issue.upsert).toHaveBeenCalledTimes(500);
  });
});
