import type { CheckResult, CheckStatus } from "@/lib/helios/shared/types";
import { formatLabel } from "@/lib/helios/shared/format";

type RunChecksListProps = {
  checks: CheckResult[];
};

const checkStatusClasses: Record<CheckStatus, string> = {
  passed: "border-success text-success",
  warning: "border-accent text-accent",
  failed: "border-danger text-danger",
};

export function RunChecksList({ checks }: RunChecksListProps) {
  if (checks.length === 0) return null;
  return (
    <div className="mt-5 border-t border-border pt-4">
      <h3 className="text-sm font-medium text-foreground">QA checks</h3>
      <div className="mt-3 max-h-64 overflow-y-auto rounded-md border border-border bg-card p-3">
        <ul className="space-y-3 text-sm">
          {checks.map((check, index) => (
            <li
              key={`${check.title}-${index}`}
              className="border-b border-border pb-3 last:border-b-0 last:pb-0"
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-foreground">{check.title}</p>
                <span
                  className={
                    "rounded-full border px-2 py-0.5 text-xs " +
                    checkStatusClasses[check.status]
                  }
                >
                  {formatLabel(check.status)} · {formatLabel(check.severity)}
                </span>
              </div>
              <p className="text-muted">{check.detail}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
