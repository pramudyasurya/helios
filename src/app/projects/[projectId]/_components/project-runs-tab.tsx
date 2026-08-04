"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PlayCircle, Filter, ExternalLink } from "lucide-react";
import type { ProjectDetailDto, LatestRun, PaginatedResponse } from "@/lib/client/api";
import { getRuns } from "@/lib/client/api";
import { formatTimestamp, formatDurationMs } from "@/lib/shared/domain/format";

type ProjectRunsTabProps = {
  project: ProjectDetailDto;
};

export function ProjectRunsTab({ project }: ProjectRunsTabProps) {
  const [runs, setRuns] = useState<LatestRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEnvId, setSelectedEnvId] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");

  async function loadRuns() {
    try {
      setLoading(true);
      const res: PaginatedResponse<LatestRun> = await getRuns({
        projectId: project.id,
        environmentId: selectedEnvId !== "all" ? selectedEnvId : undefined,
        status: selectedStatus !== "All" ? selectedStatus : undefined,
        limit: 20,
      });
      setRuns(res.data);
    } catch {
      setRuns([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRuns();
  }, [project.id, selectedEnvId, selectedStatus]);

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xs border border-border/80 bg-panel/90 shadow-xs">
        <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-wider text-muted">
          <Filter className="h-3.5 w-3.5 text-amber-400" />
          <span>Filter Runs</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Environment Filter */}
          <select
            value={selectedEnvId}
            onChange={(e) => setSelectedEnvId(e.target.value)}
            className="rounded-xs border border-border bg-card px-3 py-1.5 text-xs text-foreground focus:border-accent focus:outline-hidden cursor-pointer"
          >
            <option value="all">All Environments</option>
            {project.environments.map((env) => (
              <option key={env.id} value={env.id}>
                {env.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-xs border border-border bg-card px-3 py-1.5 text-xs text-foreground focus:border-accent focus:outline-hidden cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="Completed">Completed</option>
            <option value="Failed">Failed</option>
            <option value="Running">Running</option>
            <option value="Queued">Queued</option>
          </select>
        </div>
      </div>

      {/* Runs Table */}
      {loading ? (
        <div className="p-8 text-center bg-panel/40 border border-border/60 rounded-xs text-muted text-xs font-mono animate-pulse">
          Loading project runs...
        </div>
      ) : runs.length === 0 ? (
        <div className="p-8 text-center bg-panel/40 border border-border/60 rounded-xs space-y-2">
          <PlayCircle className="h-10 w-10 text-muted/40 mx-auto" />
          <p className="text-sm font-medium text-foreground">No Runs Found</p>
          <p className="text-xs text-muted">
            No QA runs match the selected environment or status filter for this project.
          </p>
        </div>
      ) : (
        <div className="rounded-xs border border-border/80 bg-panel/90 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-foreground">
              <thead className="bg-card/60 text-muted uppercase font-mono tracking-wider text-[10px] border-b border-border/80">
                <tr>
                  <th className="px-4 py-3">Run Target URL</th>
                  <th className="px-4 py-3">Environment</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {runs.map((run) => (
                  <tr key={run.id} className="hover:bg-card/40 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/runs/${run.id}`}
                        className="font-mono text-amber-400 hover:underline font-medium block truncate max-w-xs"
                      >
                        {run.startingUrl}
                      </Link>
                      <span className="text-[10px] font-mono text-muted">{run.id}</span>
                    </td>
                    <td className="px-4 py-3">
                      {run.environmentName ? (
                        <span className="px-2 py-0.5 rounded-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold uppercase tracking-wider">
                          {run.environmentName}
                        </span>
                      ) : (
                        <span className="text-muted/60 font-mono text-[11px]">Unlinked</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-xs text-[10px] font-semibold uppercase tracking-wider ${
                          run.status === "Completed"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : run.status === "Failed"
                              ? "bg-danger/10 text-danger border border-danger/30"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {run.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted font-mono">
                      {run.durationMs ? formatDurationMs(run.durationMs) : "-"}
                    </td>
                    <td className="px-4 py-3 text-muted font-mono">
                      {formatTimestamp(run.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/runs/${run.id}`}
                        className="rounded-xs border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground transition hover:bg-muted cursor-pointer inline-flex items-center space-x-1"
                      >
                        <span>Inspect</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
