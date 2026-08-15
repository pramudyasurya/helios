import { describe, expect, it } from "vitest";
import type { LatestRun } from "@/lib/shared/domain/types";
import { compareChecks } from "@/lib/shared/domain/check-comparison";

function makeRun(checks: LatestRun["checks"], id = "run-1"): LatestRun {
  return {
    id,
    startingUrl: "https://example.com",
    status: "Completed",
    trail: [],
    summary: "",
    checks,
    createdAt: "2026-08-01T10:00:00.000Z",
  };
}

describe("compareChecks", () => {
  it("flags a passed to failed transition as a regression", () => {
    const a = makeRun([
      { title: "Page loads", status: "passed", detail: "", severity: "info" },
    ]);
    const b = makeRun(
      [
        { title: "Page loads", status: "failed", detail: "", severity: "high" },
      ],
      "run-2",
    );

    const transitions = compareChecks(a, b);

    expect(transitions).toEqual([
      {
        title: "Page loads",
        from: "passed",
        to: "failed",
        direction: "regressed",
      },
    ]);
  });

  it("flags a failed to passed transition as an improvement", () => {
    const a = makeRun([
      { title: "API reachable", status: "failed", detail: "", severity: "high" },
    ]);
    const b = makeRun(
      [
        { title: "API reachable", status: "passed", detail: "", severity: "info" },
      ],
      "run-2",
    );

    const transitions = compareChecks(a, b);

    expect(transitions[0].direction).toBe("improved");
  });

  it("marks checks present in only one run as added or removed", () => {
    const a = makeRun([
      { title: "Only in A", status: "passed", detail: "", severity: "info" },
    ]);
    const b = makeRun(
      [
        { title: "Only in B", status: "warning", detail: "", severity: "low" },
      ],
      "run-2",
    );

    const transitions = compareChecks(a, b);

    expect(transitions).toEqual([
      {
        title: "Only in A",
        from: "passed",
        to: null,
        direction: "removed",
      },
      {
        title: "Only in B",
        from: null,
        to: "warning",
        direction: "added",
      },
    ]);
  });

  it("reports unchanged statuses and sorts by title", () => {
    const a = makeRun([
      { title: "Zeta", status: "warning", detail: "", severity: "low" },
      { title: "Alpha", status: "passed", detail: "", severity: "info" },
    ]);
    const b = makeRun(
      [
        { title: "Zeta", status: "warning", detail: "", severity: "low" },
        { title: "Alpha", status: "passed", detail: "", severity: "info" },
      ],
      "run-2",
    );

    const transitions = compareChecks(a, b);

    expect(transitions.map((t) => t.title)).toEqual(["Alpha", "Zeta"]);
    expect(transitions.every((t) => t.direction === "unchanged")).toBe(true);
  });
});
