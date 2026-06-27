import { describe, expect, it } from "vitest";
import type { CheckResult } from "@/lib/helios/shared/types";
import { getFindingsFromChecks } from "@/lib/helios/shared/findings";

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
      },
    ];

    const findings = getFindingsFromChecks(checks);

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      title: "Warning check",
      status: "warning",
    });
  });
});
