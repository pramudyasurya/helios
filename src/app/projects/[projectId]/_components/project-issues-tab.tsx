"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ExternalLink, Loader2, RefreshCw } from "lucide-react";
import type { ProjectDetailDto } from "@/lib/client/api";
import type { IssueStatus } from "@/lib/shared/domain/types";

type IssueDto = {
  id: string;
  fingerprint: string;
  type: "console" | "network" | "image";
  normalizedMessage: string;
  firstSeenRunId: string;
  lastSeenRunId: string;
  occurrences: number;
  status: IssueStatus;
  resolvedBy?: string | null;
  resolvedAtRunId?: string | null;
  createdAt: string;
  updatedAt: string;
};

type ProjectIssuesTabProps = {
  project: ProjectDetailDto;
};

const STATUS_FILTERS: Array<{ id: string; label: string }> = [
  { id: "all", label: "All Issues" },
  { id: "open", label: "Open" },
  { id: "acknowledged", label: "Acknowledged" },
  { id: "resolved", label: "Resolved" },
  { id: "ignored", label: "Ignored" },
];

export function ProjectIssuesTab({ project }: ProjectIssuesTabProps) {
  const environments = project.environments;
  const [selectedEnvId, setSelectedEnvId] = useState<string>(
    environments[0]?.id ?? "",
  );
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [issues, setIssues] = useState<IssueDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadIssues = useCallback(
    async (envId: string, filter: string) => {
      if (!envId) {
        setIssues([]);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const query = filter !== "all" ? `?status=${filter}` : "";
        const res = await fetch(
          `/api/projects/${project.id}/environments/${envId}/issues${query}`,
        );
        if (!res.ok) {
          throw new Error(`Failed to load issues: HTTP ${res.status}`);
        }
        const data = await res.json();
        setIssues(data.issues || []);
      } catch (err: unknown) {
        const msg =
          typeof err === "object" && err !== null && "message" in err
            ? (err as { message: string }).message
            : "Failed to load issues.";
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    [project.id],
  );

  useEffect(() => {
    let active = true;
    if (selectedEnvId) {
      const query = statusFilter !== "all" ? `?status=${statusFilter}` : "";
      fetch(`/api/projects/${project.id}/environments/${selectedEnvId}/issues${query}`)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((data) => {
          if (active) setIssues(data.issues || []);
        })
        .catch((err: unknown) => {
          if (active) {
            const msg =
              typeof err === "object" && err !== null && "message" in err
                ? (err as { message: string }).message
                : "Failed to load issues.";
            setError(msg);
          }
        });
    }
    return () => {
      active = false;
    };
  }, [project.id, selectedEnvId, statusFilter]);
  async function handleUpdateStatus(issueId: string, nextStatus: IssueStatus) {
    try {
      setUpdatingId(issueId);
      const res = await fetch(
        `/api/projects/${project.id}/environments/${selectedEnvId}/issues/${issueId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: nextStatus }),
        },
      );
      if (!res.ok) {
        throw new Error(`Failed to update status: HTTP ${res.status}`);
      }
      setIssues((prev) =>
        prev.map((i) => (i.id === issueId ? { ...i, status: nextStatus } : i)),
      );
    } catch (err: unknown) {
      const msg =
        typeof err === "object" && err !== null && "message" in err
          ? (err as { message: string }).message
          : "Failed to update issue status.";
      setError(msg);
    } finally {
      setUpdatingId(null);
    }
  }

  const selectedEnv = environments.find((e) => e.id === selectedEnvId);

  return (
    <div className="space-y-6">
      {/* Top Bar with Environment selector & Status Pills */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xs border border-border/80 bg-panel/90 p-4 shadow-xs">
        <div>
          <h3 className="text-base font-bold text-foreground tracking-tight">
            Recurring Issues & Triage
          </h3>
          <p className="text-xs text-muted">
            Manage fingerprinted anomalies across execution runs and suppress known noise.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {environments.length > 0 && (
            <select
              value={selectedEnvId}
              onChange={(e) => setSelectedEnvId(e.target.value)}
              className="h-8 rounded-xs border border-border bg-card px-2.5 text-xs font-semibold text-foreground outline-none focus:ring-1 focus:ring-accent cursor-pointer"
            >
              {environments.map((env) => (
                <option key={env.id} value={env.id}>
                  {env.name}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={() => loadIssues(selectedEnvId, statusFilter)}
            disabled={loading}
            className="p-1.5 rounded-xs border border-border bg-card text-muted hover:text-foreground transition cursor-pointer disabled:opacity-50"
            title="Refresh issues"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setStatusFilter(f.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-xs border transition cursor-pointer ${
              statusFilter === f.id
                ? "bg-card text-foreground border-border shadow-xs"
                : "bg-transparent text-muted border-transparent hover:text-foreground hover:bg-card/40"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xs border border-danger/40 bg-danger/10 p-3 text-xs text-danger">
          {error}
        </div>
      )}

      {loading && issues.length === 0 ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted" />
        </div>
      ) : issues.length === 0 ? (
        <div className="rounded-xs border border-dashed border-border/80 p-8 text-center bg-card/20">
          <p className="text-xs text-muted">
            No {statusFilter !== "all" ? statusFilter : ""} issues recorded for{" "}
            {selectedEnv?.name || "this environment"}.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {issues.map((issue) => {
            const isUpdating = updatingId === issue.id;

            return (
              <div
                key={issue.id}
                className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 rounded-xs border border-border/70 bg-card/40 p-4 transition hover:border-border"
              >
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-[10px] font-mono uppercase font-bold px-1.5 py-0.5 rounded-xs border ${
                        issue.type === "console"
                          ? "bg-danger/10 text-danger border-danger/30"
                          : issue.type === "network"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                            : "bg-muted/10 text-muted border-border"
                      }`}
                    >
                      {issue.type}
                    </span>

                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded-xs border ${
                        issue.status === "open"
                          ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                          : issue.status === "acknowledged"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                            : issue.status === "resolved"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                              : "bg-muted/20 text-muted border-border"
                      }`}
                    >
                      {issue.status}
                    </span>

                    <span className="text-[11px] font-mono text-muted">
                      {issue.occurrences} {issue.occurrences === 1 ? "run" : "runs"}
                    </span>
                  </div>

                  <p className="font-mono text-xs text-foreground break-all line-clamp-2">
                    {issue.normalizedMessage}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted font-mono">
                    <span>
                      First seen:{" "}
                      <Link
                        href={`/runs/${issue.firstSeenRunId}`}
                        className="text-foreground hover:text-accent underline inline-flex items-center gap-0.5"
                      >
                        run#{issue.firstSeenRunId.slice(0, 8)}
                        <ExternalLink className="h-2.5 w-2.5" />
                      </Link>
                    </span>
                    <span>&bull;</span>
                    <span>
                      Last seen:{" "}
                      <Link
                        href={`/runs/${issue.lastSeenRunId}`}
                        className="text-foreground hover:text-accent underline inline-flex items-center gap-0.5"
                      >
                        run#{issue.lastSeenRunId.slice(0, 8)}
                        <ExternalLink className="h-2.5 w-2.5" />
                      </Link>
                    </span>
                  </div>
                </div>

                {/* Triage Action Controls */}
                <div className="flex items-center gap-1.5 shrink-0 self-end md:self-center">
                  <select
                    disabled={isUpdating}
                    value={issue.status}
                    onChange={(e) =>
                      handleUpdateStatus(issue.id, e.target.value as IssueStatus)
                    }
                    className="h-7 rounded-xs border border-border bg-card px-2 text-xs font-medium text-foreground outline-none focus:ring-1 focus:ring-accent cursor-pointer disabled:opacity-50"
                  >
                    <option value="open">Open</option>
                    <option value="acknowledged">Acknowledged</option>
                    <option value="resolved">Resolved</option>
                    <option value="ignored">Ignored (Mute)</option>
                  </select>

                  {isUpdating && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted" />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
