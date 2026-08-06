"use client";

import { Plus } from "lucide-react";

interface CreateProjectCardProps {
  projectName: string;
  onProjectNameChange: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
  error: string | null;
}

export function CreateProjectCard({
  projectName,
  onProjectNameChange,
  onSubmit,
  isSubmitting,
  error,
}: CreateProjectCardProps) {
  return (
    <div className="bg-panel/90 border border-border/80 rounded-xs p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <Plus className="w-4 h-4 text-muted" />
        <h2 className="text-sm font-semibold text-foreground">Create Project</h2>
      </div>
      <p className="text-xs text-muted">
        Projects group related web applications or services.
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="projectName"
            className="block text-xs font-medium text-muted mb-1.5"
          >
            Project Name
          </label>
          <input
            id="projectName"
            type="text"
            placeholder="e.g. Storefront"
            value={projectName}
            onChange={(e) => onProjectNameChange(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-card border border-border rounded-xs text-sm text-foreground placeholder:text-muted outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
            required
          />
        </div>

        {error && (
          <div role="alert" className="p-3 bg-danger/10 border border-danger/30 text-danger rounded-xs text-xs">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !projectName.trim()}
          className="w-full py-2.5 px-4 bg-accent text-background font-semibold rounded-xs text-xs hover:opacity-95 disabled:opacity-50 transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
        >
          {isSubmitting ? "Creating..." : "Create Project"}
        </button>
      </form>
    </div>
  );
}
