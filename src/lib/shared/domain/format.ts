import type { RunStatus } from "@/lib/shared/domain/types";

export function formatTimestamp(timestamp: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(timestamp));
}

export function formatLabel(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function formatDurationMs(durationMs: number) {
  return `${(durationMs / 1000).toFixed(2)} s`;
}

export function normalizeRunStatus(status?: string): RunStatus {
  if (!status) return "Idle";
  const normalized = status.trim().toLowerCase();
  switch (normalized) {
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
    case "running":
      return "Running";
    case "queued":
      return "Queued";
    case "idle":
      return "Idle";
    default:
      return "Idle";
  }
}
