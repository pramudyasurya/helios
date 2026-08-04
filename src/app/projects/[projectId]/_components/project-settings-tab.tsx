"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Settings, Edit3, Trash2, AlertTriangle, Loader2, Copy, Check } from "lucide-react";
import type { ProjectDetailDto } from "@/lib/client/api";
import { updateProject, deleteProject } from "@/lib/client/api";
import { DeleteConfirmationModal } from "@/components/features/projects/delete-confirmation-modal";

type ProjectSettingsTabProps = {
  project: ProjectDetailDto;
  onRefresh: () => void;
};

export function ProjectSettingsTab({ project, onRefresh }: ProjectSettingsTabProps) {
  const router = useRouter();
  const [name, setName] = useState(project.name);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function copySlug() {
    navigator.clipboard.writeText(project.slug);
    setCopiedSlug(true);
    setTimeout(() => setCopiedSlug(false), 1500);
  }

  async function handleUpdateName(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    try {
      setIsSubmitting(true);
      setMessage(null);
      await updateProject(project.id, { name: trimmed });
      setMessage({ type: "success", text: "Project name updated successfully." });
      onRefresh();
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text:
          typeof err === "object" && err !== null && "message" in err
            ? (err as { message: string }).message
            : "Failed to update project.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConfirmDelete() {
    await deleteProject(project.id);
    router.push("/projects");
  }

  return (
    <div className="space-y-8 max-w-2xl">
      {/* General Settings */}
      <div className="rounded-xs border border-border/80 bg-panel/90 p-6 space-y-6 shadow-xs">
        <div className="flex items-center space-x-3 pb-4 border-b border-border/80">
          <div className="p-2 rounded-xs bg-card border border-border/60 text-muted">
            <Settings className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">General Settings</h3>
            <p className="text-xs text-muted">Update project metadata and identifier slug.</p>
          </div>
        </div>

        {message && (
          <div
            className={`p-3 rounded-xs text-xs font-medium ${
              message.type === "success"
                ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                : "bg-danger/10 border border-danger/30 text-danger"
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleUpdateName} className="space-y-4">
          <div>
            <label htmlFor="settings-project-name" className="block text-[11px] font-mono uppercase tracking-wider text-muted mb-2">
              Project Name
            </label>
            <input
              id="settings-project-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-card border border-border rounded-xs text-foreground placeholder:text-muted/60 focus:border-accent focus:outline-hidden text-xs transition-all"
            />
          </div>

          <div>
            <label htmlFor="settings-project-slug" className="block text-[11px] font-mono uppercase tracking-wider text-muted mb-2">
              Project Slug <span className="text-muted/60 lowercase">(read-only)</span>
            </label>
            <div className="flex items-center space-x-2">
              <input
                id="settings-project-slug"
                type="text"
                value={project.slug}
                disabled
                className="w-full px-3 py-2 bg-card/40 border border-border/50 rounded-xs text-muted text-xs font-mono cursor-not-allowed"
              />
              <button
                type="button"
                onClick={copySlug}
                title="Copy slug"
                className="rounded-xs border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors shrink-0 inline-flex items-center space-x-1 cursor-pointer"
              >
                {copiedSlug ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !name.trim() || name.trim() === project.name}
            className="rounded-xs border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer inline-flex items-center space-x-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Edit3 className="h-3.5 w-3.5" />
                <span>Save General Settings</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Danger Zone */}
      <div className="rounded-xs border border-danger/40 bg-panel/90 p-6 space-y-4 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xs bg-danger/10 text-danger border border-danger/30">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-danger">Danger Zone</h3>
            <p className="text-xs text-muted">
              Permanently delete this project and all attached environments.
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-border/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <span className="text-xs text-muted">
            This operation cannot be undone. Associated test runs will lose their environment reference.
          </span>
          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="rounded-xs border border-danger/40 bg-danger/10 text-danger font-semibold px-4 py-2 text-xs hover:bg-danger/20 transition-all cursor-pointer shrink-0 inline-flex items-center space-x-2"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete Project</span>
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        targetName={project.name}
        resourceType="Project"
      />
    </div>
  );
}
