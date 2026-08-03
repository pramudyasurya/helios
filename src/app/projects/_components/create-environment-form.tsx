"use client";

interface CreateEnvironmentFormProps {
  projectName: string;
  projectId: string;
  envName: string;
  envBaseUrl: string;
  onEnvNameChange: (val: string) => void;
  onEnvBaseUrlChange: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  error: string | null;
}

export function CreateEnvironmentForm({
  projectName,
  projectId,
  envName,
  envBaseUrl,
  onEnvNameChange,
  onEnvBaseUrlChange,
  onSubmit,
  onCancel,
  isSubmitting,
  error,
}: CreateEnvironmentFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="p-4 bg-card/60 border border-border/80 rounded-xs space-y-4"
    >
      <h4 className="text-xs font-semibold text-accent uppercase tracking-wider font-mono">
        Add Environment to {projectName}
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor={`envName-${projectId}`}
            className="block text-xs font-medium text-muted mb-1"
          >
            Environment Name *
          </label>
          <input
            id={`envName-${projectId}`}
            type="text"
            placeholder="e.g. Staging, Production"
            value={envName}
            onChange={(e) => onEnvNameChange(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded-xs text-xs text-foreground outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
            required
          />
        </div>
        <div>
          <label
            htmlFor={`envUrl-${projectId}`}
            className="block text-xs font-medium text-muted mb-1"
          >
            Base URL (Optional)
          </label>
          <input
            id={`envUrl-${projectId}`}
            type="url"
            placeholder="https://staging.example.com"
            value={envBaseUrl}
            onChange={(e) => onEnvBaseUrlChange(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded-xs text-xs text-foreground outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </div>
      </div>

      {error && (
        <div role="alert" className="p-2 bg-danger/10 border border-danger/30 text-danger rounded-xs text-xs">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-xs text-muted hover:text-foreground transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !envName.trim()}
          className="px-3 py-1.5 bg-accent text-background font-semibold rounded-xs text-xs hover:opacity-95 disabled:opacity-50 transition-colors cursor-pointer"
        >
          {isSubmitting ? "Saving..." : "Save Environment"}
        </button>
      </div>
    </form>
  );
}
