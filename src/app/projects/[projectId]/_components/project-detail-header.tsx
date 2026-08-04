"use client";

import type { ProjectDetailDto } from "@/lib/client/api";
import { formatTimestamp } from "@/lib/shared/domain/format";

type ProjectDetailHeaderProps = {
  project: ProjectDetailDto;
};

export function ProjectDetailHeader({ project }: ProjectDetailHeaderProps) {
  const stats = project.stats || {
    totalRuns: 0,
    passedRuns: 0,
    failedRuns: 0,
    passRate: 0,
    lastRunAt: null,
  };

  const passRate = stats.passRate || 0;

  return (
    <header className="rounded-xs border border-border/80 bg-linear-to-r from-panel/90 via-panel/70 to-card/60 px-6 py-5 sm:py-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl text-foreground">
          {project.name}
        </h1>
        <p className="mt-1 text-xs text-muted">
          slug: <span className="font-mono text-foreground">{project.slug}</span>
        </p>
      </div>

      {/* Stats Badges */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Environments Count */}
        <div className="rounded-xs border border-border/80 bg-panel/90 px-3.5 py-2 text-xs">
          <p className="text-muted text-[11px] font-medium">Environments</p>
          <p className="font-semibold text-foreground mt-0.5">{project.environments.length}</p>
        </div>

        {/* Pass Rate Gauge */}
        <div className="rounded-xs border border-border/80 bg-panel/90 px-3.5 py-2 text-xs">
          <p className="text-muted text-[11px] font-medium">Pass Rate</p>
          <p className="font-semibold text-foreground mt-0.5">{passRate}%</p>
        </div>

        {/* Last Run */}
        <div className="rounded-xs border border-border/80 bg-panel/90 px-3.5 py-2 text-xs">
          <p className="text-muted text-[11px] font-medium">Last Active</p>
          <p className="font-semibold text-foreground mt-0.5">
            {stats.lastRunAt ? formatTimestamp(stats.lastRunAt) : "No runs yet"}
          </p>
        </div>
      </div>
    </header>
  );
}
