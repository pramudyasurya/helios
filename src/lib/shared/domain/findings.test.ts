import { describe, expect, it } from "vitest";
import type { CheckResult } from "@/lib/shared/domain/types";
import { getFindingsFromChecks } from "@/lib/shared/domain/findings";

describe("getFindingsFromChecks", () => {
  it("returns checks that did not pass", () => {
    const checks: CheckResult[] = [
      {
        title: "Passed check",
        detail: "ok",
        status: "passed",
        severity: "info",
      },
      {
        title: "Warning check",
        detail: "needs review",
        status: "warning",
        severity: "medium",
        evidenceType: "console",
      },
    ];

    const findings = getFindingsFromChecks(checks);

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      title: "Warning check",
      status: "warning",
      evidenceLabel: "View console evidence",
    });
  });
});
