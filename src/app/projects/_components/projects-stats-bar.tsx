"use client";

import type { ProjectDto } from "@/lib/client/api";

type ProjectsStatsBarProps = {
  projects: ProjectDto[];
};

export function ProjectsStatsBar({ projects }: ProjectsStatsBarProps) {
  const totalProjects = projects.length;
  const totalEnvironments = projects.reduce(
    (acc, p) => acc + (p.environments?.length || 0),
    0,
  );
  const totalRuns = projects.reduce((acc, p) => acc + (p.totalRuns || 0), 0);

  const validPassRates = projects
    .filter((p) => typeof p.passRate === "number" && (p.totalRuns || 0) > 0)
    .map((p) => p.passRate as number);

  const avgPassRate =
    validPassRates.length > 0
      ? Math.round(
          validPassRates.reduce((a, b) => a + b, 0) / validPassRates.length,
        )
      : 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
      {/* Total Projects */}
      <div className="rounded-xs border border-border/80 bg-panel/90 p-4 shadow-sm">
        <p className="text-xs font-medium text-muted">Configured Projects</p>
        <p className="mt-1 text-2xl font-semibold text-foreground">
          {totalProjects}
        </p>
      </div>

      {/* Environments */}
      <div className="rounded-xs border border-border/80 bg-panel/90 p-4 shadow-sm">
        <p className="text-xs font-medium text-muted">Active Environments</p>
        <p className="mt-1 text-2xl font-semibold text-foreground">
          {totalEnvironments}
        </p>
      </div>

      {/* Linked Runs */}
      <div className="rounded-xs border border-border/80 bg-panel/90 p-4 shadow-sm">
        <p className="text-xs font-medium text-muted">Linked QA Runs</p>
        <p className="mt-1 text-2xl font-semibold text-foreground">{totalRuns}</p>
      </div>

      {/* Avg Pass Rate */}
      <div className="rounded-xs border border-border/80 bg-panel/90 p-4 shadow-sm">
        <p className="text-xs font-medium text-muted">Average Pass Rate</p>
        <p
          className={`mt-1 text-2xl font-semibold ${
            avgPassRate > 0 ? "text-amber-400 font-bold" : "text-muted"
          }`}
        >
          {avgPassRate}%
        </p>
      </div>
    </div>
  );
}
