"use client";

import { useEffect, useRef, useState } from "react";
import { X, AlertCircle, Loader2 } from "lucide-react";
import { useModalFocus } from "@/lib/client/use-modal-focus";
import type { ProjectDto } from "@/lib/client/api";

type ProjectModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
  projectToEdit?: ProjectDto | null;
};

export function ProjectModal({
  isOpen,
  onClose,
  onSave,
  projectToEdit,
}: ProjectModalProps) {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  useModalFocus(modalRef, isOpen, onClose);

  useEffect(() => {
    if (isOpen) {
      setName(projectToEdit ? projectToEdit.name : "");
      setError(null);
    }
  }, [isOpen, projectToEdit]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Project name is required.");
      return;
    }
    if (trimmed.length > 100) {
      setError("Project name must be 100 characters or fewer.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave(trimmed);
      onClose();
    } catch (err: unknown) {
      const msg =
        typeof err === "object" && err !== null && "message" in err
          ? (err as { message: string }).message
          : "Failed to save project.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  const isEditing = Boolean(projectToEdit);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        ref={modalRef}
        className="w-full max-w-md bg-panel border border-border/80 rounded-xs shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/60">
          <h2 id="project-modal-title" className="text-base font-bold text-foreground tracking-tight">
            {isEditing ? "Edit Project" : "Create New Project"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="text-muted hover:text-foreground p-1 rounded-xs transition-colors focus:outline-hidden cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start space-x-2.5 p-3 rounded-xs bg-danger/10 border border-danger/30 text-danger text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label htmlFor="project-name-input" className="block text-[11px] font-mono uppercase tracking-wider text-muted mb-2">
              Project Name
            </label>
            <input
              id="project-name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. E-Commerce Platform"
              autoFocus
              className="w-full px-3 py-2 bg-card border border-border rounded-xs text-foreground placeholder:text-muted/60 focus:border-accent focus:outline-hidden text-xs transition-all"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xs border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="rounded-xs border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer inline-flex items-center space-x-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{isEditing ? "Save Changes" : "Create Project"}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
