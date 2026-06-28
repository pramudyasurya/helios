import type { CheckResult, EvidenceType } from "@/lib/helios/shared/types";

export type Finding = CheckResult & {
  evidenceLabel?: string;
};

const evidenceLabels: Record<EvidenceType, string> = {
  image: "View image evidence",
  console: "View console evidence",
  network: "View network evidence",
};

export function getFindingsFromChecks(checks: CheckResult[]): Finding[] {
  return checks
    .filter((check) => check.status !== "passed")
    .map((check) => ({
      ...check,
      evidenceLabel: check.evidenceType
        ? evidenceLabels[check.evidenceType]
        : undefined,
    }));
}
