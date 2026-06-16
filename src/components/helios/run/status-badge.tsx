import type { RunStatus } from "@/lib/helios/shared/types";

const statusBadgeClasses: Record<RunStatus, string> = {
  Idle: "border-border text-muted",
  Queued: "border-accent text-accent",
  Running: "border-accent text-accent",
  Completed: "border-success text-success",
  Failed: "border-danger text-danger",
};

export function StatusBadge({ status }: { status: RunStatus }) {
  const badgeClass =
    "rounded-full border px-2 py-1 text-xs " + statusBadgeClasses[status];
  return <span className={badgeClass}>{status}</span>;
}
