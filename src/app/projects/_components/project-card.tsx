"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Globe,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  ChevronRight,
  Shield,
  Copy,
  Check,
} from "lucide-react";
import type { ProjectDto, EnvironmentDto } from "@/lib/client/api";

type ProjectCardProps = {
  project: ProjectDto;
  onEditProject: (project: ProjectDto) => void;
  onDeleteProject: (projectId: string, name: string) => void;
  onAddEnvironment: (project: ProjectDto) => void;
  onEditEnvironment: (project: ProjectDto, env: EnvironmentDto) => void;
};

export function ProjectCard({
  project,
  onEditProject,
  onDeleteProject,
  onAddEnvironment,
  onEditEnvironment,
}: ProjectCardProps) {
  const [copiedSlug, setCopiedSlug] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const environments = project.environments || [];
  const passRate = typeof project.passRate === "number" ? project.passRate : 0;
  const totalRuns = project.totalRuns || 0;

  function copySlug(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(project.slug);
    setCopiedSlug(true);
    setTimeout(() => setCopiedSlug(false), 1500);
  }

  function copyUrl(e: React.MouseEvent, url: string) {
    e.stopPropagation();
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 1500);
  }

  return (
    <div className="rounded-xs border border-border/80 bg-panel/90 shadow-sm hover:bg-card/30 transition flex flex-col justify-between overflow-hidden group">
      {/* Card Body */}
      <div className="p-5 space-y-4">
        {/* Header Row */}
        <div className="flex items-start justify-between">
          <div>
            <Link
              href={`/projects/${project.id}`}
              className="text-base font-bold text-foreground hover:text-accent transition-colors flex items-center space-x-1"
            >
              <span>{project.name}</span>
              <ChevronRight className="h-4 w-4 text-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
            </Link>

            <div className="flex items-center space-x-1.5 mt-1 text-xs text-muted">
              <span>
                slug: <span className="font-mono text-foreground">{project.slug}</span>
              </span>
              <button
                type="button"
                onClick={copySlug}
                title="Copy slug"
                className="text-muted/60 hover:text-foreground transition-colors p-0.5 rounded-xs cursor-pointer"
              >
                {copiedSlug ? (
                  <Check className="h-3 w-3 text-emerald-400" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </button>
            </div>
          </div>

          {/* Action Menu Buttons */}
          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={() => onEditProject(project)}
              title="Edit project"
              className="p-1.5 text-muted hover:text-foreground hover:bg-card rounded-xs transition-colors cursor-pointer"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDeleteProject(project.id, project.name)}
              title="Delete project"
              className="p-1.5 text-muted hover:text-danger hover:bg-danger/10 rounded-xs transition-colors cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Visual Pass Rate Gauge */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs text-muted font-mono">
            <span>Pass Rate ({totalRuns} runs)</span>
            <span
              className={`font-semibold ${
                passRate > 0 ? "text-foreground" : "text-muted"
              }`}
            >
              {passRate}%
            </span>
          </div>
          <div className="w-full h-1 bg-card border border-border/50 rounded-xs overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${Math.max(passRate, 0)}%` }}
            />
          </div>
        </div>

        {/* Environments Grid */}
        <div className="pt-2 border-t border-border/60">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-muted">
              Environments ({environments.length})
            </span>
            <button
              type="button"
              onClick={() => onAddEnvironment(project)}
              className="text-[11px] text-muted hover:text-foreground font-medium inline-flex items-center space-x-1 transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Env</span>
            </button>
          </div>

          {environments.length === 0 ? (
            <div className="py-2 px-3 text-center bg-card/20 rounded-xs border border-dashed border-border/60 space-y-2">
              <p className="text-xs text-muted/70 italic">
                No environments configured yet.
              </p>
              <button
                type="button"
                onClick={() => onAddEnvironment(project)}
                className="rounded-xs border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-muted transition-colors cursor-pointer inline-flex items-center space-x-1"
              >
                <Plus className="h-3 w-3" />
                <span>Add Environment</span>
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              {environments.map((env) => (
                <div
                  key={env.id}
                  className="flex items-center justify-between p-2 bg-card/40 hover:bg-card/80 border border-border/50 rounded-xs transition-colors text-xs"
                >
                  <div className="flex items-center space-x-2 truncate">
                    <Shield className="h-3.5 w-3.5 text-muted shrink-0" />
                    <span className="font-medium text-foreground truncate">
                      {env.name}
                    </span>
                    {env.baseUrl && (
                      <div className="flex items-center space-x-1 truncate max-w-[150px]">
                        <a
                          href={env.baseUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-muted hover:text-accent inline-flex items-center space-x-1 truncate font-mono text-[11px]"
                          title={env.baseUrl}
                        >
                          <Globe className="h-3 w-3 shrink-0" />
                          <span className="truncate">{env.baseUrl}</span>
                          <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                        </a>
                        <button
                          type="button"
                          onClick={(e) => copyUrl(e, env.baseUrl!)}
                          title="Copy Base URL"
                          className="text-muted/60 hover:text-foreground transition-colors p-0.5 rounded-xs shrink-0 cursor-pointer"
                        >
                          {copiedUrl === env.baseUrl ? (
                            <Check className="h-3 w-3 text-emerald-400" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onEditEnvironment(project, env)}
                    className="p-1 text-muted/60 hover:text-foreground rounded-xs transition-colors shrink-0 cursor-pointer"
                    title="Edit environment"
                  >
                    <Edit2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Card Footer Link */}
      <div className="border-t border-border/60 bg-card/40 px-5 py-2.5 flex items-center justify-between text-xs">
        <span className="text-muted text-[11px]">Managed Scope</span>
        <Link
          href={`/projects/${project.id}`}
          className="text-foreground hover:text-accent font-medium inline-flex items-center space-x-1 transition-colors"
        >
          <span>View Workspace</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
