"use client";

import { useState } from "react";
import { Plus, Shield, Globe, ExternalLink, Edit2, Trash2, Clock, Copy, Check } from "lucide-react";
import type { ProjectDetailDto, EnvironmentDto } from "@/lib/client/api";
import { EnvironmentModal } from "@/components/features/projects/environment-modal";
import { DeleteConfirmationModal } from "@/components/features/projects/delete-confirmation-modal";
import { createEnvironment, updateEnvironment, deleteEnvironment } from "@/lib/client/api";
import { formatTimestamp } from "@/lib/shared/domain/format";

type ProjectEnvironmentsTabProps = {
  project: ProjectDetailDto;
  onRefresh: () => void;
};

export function ProjectEnvironmentsTab({ project, onRefresh }: ProjectEnvironmentsTabProps) {
  const [isEnvModalOpen, setIsEnvModalOpen] = useState(false);
  const [envToEdit, setEnvToEdit] = useState<EnvironmentDto | null>(null);
  const [envToDelete, setEnvToDelete] = useState<{ id: string; name: string } | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  function openAddEnv() {
    setEnvToEdit(null);
    setIsEnvModalOpen(true);
  }

  function openEditEnv(env: EnvironmentDto) {
    setEnvToEdit(env);
    setIsEnvModalOpen(true);
  }

  function copyUrl(e: React.MouseEvent, url: string) {
    e.stopPropagation();
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 1500);
  }

  async function handleSaveEnv(data: { name: string; baseUrl?: string | null }) {
    if (envToEdit) {
      await updateEnvironment(project.id, envToEdit.id, data);
    } else {
      await createEnvironment(project.id, {
        name: data.name,
        baseUrl: data.baseUrl || undefined,
      });
    }
    onRefresh();
  }

  function promptDeleteEnv(envId: string, name: string) {
    setEnvToDelete({ id: envId, name });
  }

  async function handleConfirmDeleteEnv() {
    if (!envToDelete) return;
    await deleteEnvironment(project.id, envToDelete.id);
    setEnvToDelete(null);
    onRefresh();
  }

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xs border border-border/80 bg-panel/90 p-4 shadow-xs">
        <div>
          <h3 className="text-base font-bold text-foreground tracking-tight">Environments</h3>
          <p className="text-xs text-muted">
            Manage target environments and default base URLs for Playwright check execution.
          </p>
        </div>
        <button
          type="button"
          onClick={openAddEnv}
          className="rounded-xs border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer inline-flex items-center space-x-1.5 shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Add Environment</span>
        </button>
      </div>

      {/* Environments Grid */}
      {project.environments.length === 0 ? (
        <div className="p-8 text-center bg-panel/40 border border-border/60 rounded-xs space-y-3">
          <Shield className="h-10 w-10 text-muted/40 mx-auto" />
          <p className="text-sm font-medium text-foreground">No Environments Configured</p>
          <p className="text-xs text-muted max-w-sm mx-auto">
            Add environments like Staging or Production to run targeted Playwright check suites.
          </p>
          <button
            type="button"
            onClick={openAddEnv}
            className="rounded-xs border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer inline-flex items-center space-x-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Environment Now</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {project.environments.map((env) => (
            <div
              key={env.id}
              className="rounded-xs border border-border/80 bg-panel/90 p-5 space-y-4 shadow-xs hover:bg-card/30 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xs bg-card border border-border/60 text-muted">
                    <Shield className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">{env.name}</h4>
                    {env.lastRunAt ? (
                      <p className="text-[11px] text-muted flex items-center space-x-1 mt-0.5 font-mono">
                        <Clock className="h-3 w-3 text-muted shrink-0" />
                        <span>Last run: {formatTimestamp(env.lastRunAt)}</span>
                      </p>
                    ) : (
                      <p className="text-[11px] text-muted/70 italic mt-0.5">No runs yet</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => openEditEnv(env)}
                    className="p-1.5 text-muted hover:text-foreground hover:bg-card rounded-xs transition-colors cursor-pointer"
                    title="Edit environment"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => promptDeleteEnv(env.id, env.name)}
                    className="p-1.5 text-muted hover:text-danger hover:bg-danger/10 rounded-xs transition-colors cursor-pointer"
                    title="Delete environment"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Target Base URL */}
              <div className="pt-2 border-t border-border/60">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted block mb-1">
                  Target Base URL
                </span>
                {env.baseUrl ? (
                  <div className="flex items-center justify-between">
                    <a
                      href={env.baseUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-foreground hover:text-accent inline-flex items-center space-x-1.5 truncate max-w-[85%] font-mono"
                    >
                      <Globe className="h-3.5 w-3.5 text-muted shrink-0" />
                      <span className="truncate">{env.baseUrl}</span>
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                    <button
                      type="button"
                      onClick={(e) => copyUrl(e, env.baseUrl!)}
                      title="Copy URL"
                      className="p-1 text-muted/60 hover:text-foreground rounded-xs transition-colors shrink-0 cursor-pointer"
                    >
                      {copiedUrl === env.baseUrl ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-muted/60 italic font-mono">Not set</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <EnvironmentModal
        isOpen={isEnvModalOpen}
        onClose={() => setIsEnvModalOpen(false)}
        onSave={handleSaveEnv}
        projectName={project.name}
        envToEdit={envToEdit}
      />

      <DeleteConfirmationModal
        isOpen={Boolean(envToDelete)}
        onClose={() => setEnvToDelete(null)}
        onConfirm={handleConfirmDeleteEnv}
        targetName={envToDelete?.name || ""}
        resourceType="Environment"
      />
    </div>
  );
}
