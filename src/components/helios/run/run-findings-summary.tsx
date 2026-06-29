import type { CheckResult, EvidenceType } from "@/lib/helios/shared/types";
import { getFindingsFromChecks } from "@/lib/helios/shared/findings";
import { formatLabel } from "@/lib/helios/shared/format";
import { EmptyState } from "@/components/helios/ui/empty-state";

type RunFindingsSummaryProps = {
  checks: CheckResult[];
  onViewEvidence?: (evidenceType: EvidenceType) => void;
  showEmptyState?: boolean;
};

const severityClasses = {
  info: "border-success text-success",
  low: "border-accent text-accent",
  medium: "border-accent text-accent",
  high: "border-danger text-danger",
} as const;

export function RunFindingsSummary({
  checks,
  onViewEvidence,
  showEmptyState = false,
}: RunFindingsSummaryProps) {
  const findings = getFindingsFromChecks(checks);

  if (findings.length === 0) {
    if (!showEmptyState) return null;

    return (
      <EmptyState
        title="No findings to review"
        description="All QA checks passed or only informational checks were recorded."
      />
    );
  }

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h3 className="text-sm font-medium text-foreground">
        Findings to review
      </h3>

      <ul className="mt-3 space-y-3">
        {findings.map((finding, index) => {
          const evidenceType = finding.evidenceType;

          return (
            <li
              key={`${finding.title}-${index}`}
              className="border-b border-border pb-3 text-sm last:border-b-0 last:pb-0"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-foreground">{finding.title}</p>
                <span
                  className={
                    "rounded-full border px-2 py-0.5 text-xs " +
                    severityClasses[finding.severity]
                  }
                >
                  {formatLabel(finding.severity)}
                </span>
              </div>
              <p className="mt-1 text-muted">{finding.detail}</p>

              {evidenceType && finding.evidenceLabel && onViewEvidence && (
                <button
                  type="button"
                  onClick={() => onViewEvidence(evidenceType)}
                  className="mt-2 text-xs font-medium text-accent transition hover:underline"
                >
                  {finding.evidenceLabel}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
