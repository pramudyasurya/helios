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
