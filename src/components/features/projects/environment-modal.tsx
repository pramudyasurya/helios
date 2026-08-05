"use client";

import { useEffect, useRef, useState } from "react";
import { X, AlertCircle, Loader2 } from "lucide-react";
import { useModalFocus } from "@/lib/client/use-modal-focus";
import type { EnvironmentDto } from "@/lib/client/api";

import { isValidHttpUrl } from "@/lib/shared/domain/validators";

type EnvironmentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; baseUrl?: string | null }) => Promise<void>;
  projectName?: string;
  envToEdit?: EnvironmentDto | null;
};

export function EnvironmentModal({
  isOpen,
  onClose,
  onSave,
  projectName,
  envToEdit,
}: EnvironmentModalProps) {
  const [name, setName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  useModalFocus(modalRef, isOpen, onClose);

  useEffect(() => {
    if (isOpen) {
      setName(envToEdit ? envToEdit.name : "");
      setBaseUrl(envToEdit?.baseUrl || "");
      setError(null);
    }
  }, [isOpen, envToEdit]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Environment name is required.");
      return;
    }

    const trimmedUrl = baseUrl.trim();
    if (trimmedUrl && !isValidHttpUrl(trimmedUrl)) {
      setError("Please enter a valid HTTP/HTTPS URL (e.g. https://staging.example.com)");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave({
        name: trimmedName,
        baseUrl: trimmedUrl || null,
      });
      onClose();
    } catch (err: unknown) {
      const msg =
        typeof err === "object" && err !== null && "message" in err
          ? (err as { message: string }).message
          : "Failed to save environment.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  const isEditing = Boolean(envToEdit);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="env-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        ref={modalRef}
        className="w-full max-w-md bg-panel border border-border/80 rounded-xs shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/60">
          <div>
            <h2 id="env-modal-title" className="text-base font-bold text-foreground tracking-tight">
              {isEditing ? "Edit Environment" : "Add Environment"}
            </h2>
            {projectName && (
              <p className="text-[11px] font-mono text-muted">
                Target: <span className="text-foreground">{projectName}</span>
              </p>
            )}
          </div>
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
            <label htmlFor="env-name-input" className="block text-[11px] font-mono uppercase tracking-wider text-muted mb-2">
              Environment Name
            </label>
            <input
              id="env-name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Staging, Production, UAT"
              autoFocus
              className="w-full px-3 py-2 bg-card border border-border rounded-xs text-foreground placeholder:text-muted/60 focus:border-accent focus:outline-hidden text-xs transition-all"
            />
          </div>

          <div>
            <label htmlFor="env-url-input" className="block text-[11px] font-mono uppercase tracking-wider text-muted mb-2">
              Target Base URL <span className="text-muted/60 lowercase">(optional)</span>
            </label>
            <input
              id="env-url-input"
              type="url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://staging.example.com"
              className="w-full px-3 py-2 bg-card border border-border rounded-xs text-foreground placeholder:text-muted/60 focus:border-accent focus:outline-hidden text-xs font-mono transition-all"
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
                <span>{isEditing ? "Save Environment" : "Add Environment"}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
