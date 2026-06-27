import type { CheckResult } from "@/lib/helios/shared/types";

export function getFindingsFromChecks(checks: CheckResult[]) {
  return checks.filter((check) => check.status !== "passed");
}
