import type { RunStatus } from "@/lib/shared/domain/types";
import { normalizeRunStatus } from "@/lib/shared/domain/format";

const statusBadgeClasses: Record<RunStatus, string> = {
  Idle: "border-border/60 text-muted/80 bg-card/30",
  Queued: "border-amber-500/25 text-amber-300/80 bg-amber-500/5",
  Running: "border-amber-500/25 text-amber-300/80 bg-amber-500/5",
  Completed: "border-emerald-500/25 text-emerald-400/80 bg-emerald-500/5",
  Failed: "border-rose-500/25 text-rose-400/80 bg-rose-500/5",
};

export function StatusBadge({ status }: { status: string }) {
  const normalized = normalizeRunStatus(status);
  const badgeClass =
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition " +
    statusBadgeClasses[normalized];
  return <span className={badgeClass}>{normalized}</span>;
}
