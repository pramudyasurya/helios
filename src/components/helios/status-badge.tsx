import type { RunStatus } from "@/lib/helios/types";

function getStatusBadgeClass(status: RunStatus): string {
  return status === "Queued"
    ? "border-accent text-accent"
    : "border-border text-muted";
}

export function StatusBadge({ status }: { status: RunStatus }) {
  const badgeClass =
    "rounded-full border px-2 py-1 text-xs " + getStatusBadgeClass(status);
  return <span className={badgeClass}>{status}</span>;
}
