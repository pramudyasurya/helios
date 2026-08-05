import type { CheckResult, EvidenceType } from "@/lib/shared/domain/types";
import { getFindingsFromChecks } from "@/lib/shared/domain/findings";
import { formatLabel } from "@/lib/shared/domain/format";
import { EmptyState } from "@/components/ui/empty-state";
import { ShieldCheck, ArrowUpRight } from "lucide-react";

type RunFindingsSummaryProps = {
  checks: CheckResult[];
  onViewEvidence?: (evidenceType: EvidenceType) => void;
  showEmptyState?: boolean;
};

const severityClasses = {
  info: "border-border/60 text-muted bg-card/40",
  low: "border-border/60 text-muted bg-card/40",
  medium: "border-amber-500/30 text-amber-400 bg-amber-500/5",
  high: "border-danger/30 text-danger bg-danger/5",
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
        icon={ShieldCheck}
      />
    );
  }

  return (
    <section className="space-y-3">
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
                  className="group mt-2 flex w-fit items-center gap-1 text-xs font-medium text-accent transition"
                >
                  <span className="group-hover:underline">
                    {finding.evidenceLabel}
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
