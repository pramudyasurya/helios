"use client";

import { useEffect, useRef, useState } from "react";
import { X, AlertTriangle, AlertCircle, Loader2 } from "lucide-react";
import { useModalFocus } from "@/lib/client/use-modal-focus";

export type DeleteConfirmationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  targetName: string;
  resourceType: "Project" | "Environment";
};

export function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  targetName,
  resourceType,
}: DeleteConfirmationModalProps) {
  const [typedValue, setTypedValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  useModalFocus(modalRef, isOpen, onClose);

  useEffect(() => {
    if (isOpen) {
      setTypedValue("");
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isConfirmed = typedValue.trim() === targetName;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isConfirmed) return;

    try {
      setIsSubmitting(true);
      setError(null);
      await onConfirm();
      onClose();
    } catch (err: unknown) {
      const msg =
        typeof err === "object" && err !== null && "message" in err
          ? (err as { message: string }).message
          : `Failed to delete ${resourceType.toLowerCase()}.`;
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        ref={modalRef}
        className="w-full max-w-md bg-panel border border-danger/40 rounded-xs shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/60">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-xs bg-danger/10 text-danger border border-danger/30">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <h2 id="delete-modal-title" className="text-base font-bold text-danger tracking-tight">
              Delete {resourceType}
            </h2>
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

          <div className="text-xs text-muted leading-relaxed space-y-2">
            <p>
              This action <strong className="text-danger font-semibold">cannot be undone</strong>. This will permanently delete the{" "}
              <span className="text-foreground font-semibold lowercase">{resourceType}</span>{" "}
              <span className="font-mono text-foreground font-semibold px-1 py-0.5 bg-card rounded-xs border border-border/60">{targetName}</span>
              {resourceType === "Project" ? " and all of its configured environments." : "."}
            </p>
            <p>
              Please type <span className="font-mono text-foreground font-bold">{targetName}</span> below to confirm:
            </p>
          </div>

          <div>
            <input
              type="text"
              value={typedValue}
              onChange={(e) => setTypedValue(e.target.value)}
              placeholder={`Type "${targetName}" to confirm`}
              autoFocus
              className="w-full px-3 py-2 bg-card border border-border rounded-xs text-foreground placeholder:text-muted/60 focus:border-danger focus:outline-hidden text-xs font-mono transition-all"
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
              disabled={isSubmitting || !isConfirmed}
              className="rounded-xs border border-danger/40 bg-danger/10 text-danger font-semibold px-4 py-1.5 text-xs hover:bg-danger/20 transition-all cursor-pointer inline-flex items-center space-x-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <span>Delete {resourceType}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
