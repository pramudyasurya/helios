import type { LatestRun } from "@/lib/shared/domain/types";

export function downloadRunJson(run: LatestRun) {
  const json = JSON.stringify(run, null, 2);
  const blob = new Blob([json], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `helios-${run.id}.json`;
  link.click();

  URL.revokeObjectURL(url);
}

export function downloadRunHtml(runId: string) {
  const link = document.createElement("a");
  link.href = `/api/runs/${runId}/export/html`;
  link.download = `helios-audit-${runId}.html`;
  link.click();
}
