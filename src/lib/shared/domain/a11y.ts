import type { CheckResult, CheckStatus, CheckSeverity, A11yViolation } from "@/lib/shared/domain/types";

const IMPACT_TO_SEVERITY: Record<string, CheckSeverity> = {
  critical: "high",
  serious: "medium",
  moderate: "low",
  minor: "info",
};

export function evaluateA11yViolations(violations: A11yViolation[]): CheckResult[] {
  if (violations.length === 0) {
    return [
      {
        title: "Accessibility (WCAG AA)",
        detail: "No automated WCAG accessibility violations detected.",
        status: "passed",
        severity: "info",
      },
    ];
  }

  const criticalOrSerious = violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious",
  );
  const status: CheckStatus = criticalOrSerious.length > 0 ? "failed" : "warning";
  const worstImpact = criticalOrSerious.some((v) => v.impact === "critical")
    ? "critical"
    : criticalOrSerious.length > 0
      ? "serious"
      : violations.some((v) => v.impact === "moderate")
        ? "moderate"
        : "minor";

  const countsByImpact = violations.reduce(
    (acc, v) => {
      const imp = v.impact || "minor";
      acc[imp] = (acc[imp] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const parts = Object.entries(countsByImpact)
    .map(([imp, count]) => `${count} ${imp}`)
    .join(", ");

  const sampleRules = violations
    .slice(0, 3)
    .map((v) => v.id)
    .join(", ");
  const moreText = violations.length > 3 ? ` (+${violations.length - 3} more)` : "";

  return [
    {
      title: "Accessibility (WCAG AA)",
      detail: `Detected ${violations.length} accessibility violation(s) (${parts}): ${sampleRules}${moreText}.`,
      status,
      severity: IMPACT_TO_SEVERITY[worstImpact] || "medium",
    },
  ];
}

export function formatA11yFingerprintMessage(violation: A11yViolation, targetSelector: string): string {
  return `a11y:${violation.id}:${targetSelector}`;
}
