import type { LatestRun } from "@/lib/shared/domain/types";

import { RunAdminDetails } from "@/app/runs/[id]/_components/run-admin-details";
import { RunMetricsGrid } from "@/app/runs/[id]/_components/run-metrics-grid";
import { RunSummaryCard } from "@/app/runs/[id]/_components/run-summary-card";
import { ScreenshotGallery } from "@/app/runs/[id]/_components/screenshot-gallery";

type RunOverviewProps = {
  run: LatestRun;
};

export function RunOverview({ run }: RunOverviewProps) {
  return (
    <div className="space-y-6">
      <RunSummaryCard summary={run.summary} />
      <RunMetricsGrid run={run} />
      <ScreenshotGallery artifacts={run.artifacts} />
      <RunAdminDetails run={run} />
    </div>
  );
}
