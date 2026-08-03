"use client";

import { Globe, Plus, ShieldCheck } from "lucide-react";
import type { ProjectWithEnvironments } from "@/lib/shared/domain/types";
import { CreateEnvironmentForm } from "./create-environment-form";

interface ProjectItemCardProps {
  project: ProjectWithEnvironments;
  isSelectedForEnv: boolean;
  onToggleAddEnv: () => void;
  envName: string;
  envBaseUrl: string;
  onEnvNameChange: (val: string) => void;
  onEnvBaseUrlChange: (val: string) => void;
  onSaveEnv: (e: React.FormEvent) => void;
  isSubmittingEnv: boolean;
  envError: string | null;
}

export function ProjectItemCard({
  project,
  isSelectedForEnv,
  onToggleAddEnv,
  envName,
  envBaseUrl,
  onEnvNameChange,
  onEnvBaseUrlChange,
  onSaveEnv,
  isSubmittingEnv,
  envError,
}: ProjectItemCardProps) {
  return (
    <div className="bg-panel/90 border border-border/80 rounded-xs p-6 shadow-sm space-y-5">
      <div className="flex items-center justify-between border-b border-border/60 pb-4">
        <div>
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            {project.name}
          </h3>
          <p className="text-xs text-muted font-mono mt-0.5">
            slug: {project.slug}
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleAddEnv}
          aria-expanded={isSelectedForEnv}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xs border border-border/80 bg-card text-muted hover:text-foreground hover:border-border transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Environment
        </button>
      </div>

      {isSelectedForEnv && (
        <CreateEnvironmentForm
          projectName={project.name}
          projectId={project.id}
          envName={envName}
          envBaseUrl={envBaseUrl}
          onEnvNameChange={onEnvNameChange}
          onEnvBaseUrlChange={onEnvBaseUrlChange}
          onSubmit={onSaveEnv}
          onCancel={onToggleAddEnv}
          isSubmitting={isSubmittingEnv}
          error={envError}
        />
      )}

      {project.environments.length === 0 ? (
        <p className="text-xs text-muted italic">
          No environments configured for this project.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {project.environments.map((env) => (
            <div
              key={env.id}
              className="p-3 bg-card/60 border border-border/70 rounded-xs flex items-start justify-between gap-2"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-accent" />
                  <span className="text-xs font-semibold text-foreground">
                    {env.name}
                  </span>
                </div>
                {env.baseUrl ? (
                  <a
                    href={env.baseUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-muted hover:text-accent flex items-center gap-1 font-mono truncate transition-colors"
                  >
                    <Globe className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{env.baseUrl}</span>
                  </a>
                ) : (
                  <span className="text-[11px] text-muted/60 italic block font-mono">
                    No base URL specified
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
