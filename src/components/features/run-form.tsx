import { useState, useEffect, type RefObject } from "react";
import Link from "next/link";
import { FolderGit2, ExternalLink } from "lucide-react";
import {
  RunOptionsPicker,
  type RunConfig,
} from "@/components/features/run-options-picker";
import type { ProjectWithEnvironments } from "@/lib/shared/domain/types";
import { getProjects } from "@/lib/client/api";
import { HELIOS_ROUTES } from "@/lib/shared/domain/routes";

type RunFormProps = {
  onSubmit: (url: string, config: RunConfig) => void;
  isDisabled?: boolean;
  error?: string;
  urlInputRef?: RefObject<HTMLInputElement | null>;
  onTargetContextChange?: (projectId?: string, environmentId?: string) => void;
};

const PRESET_URLS = [
  "https://example.com",
  "https://httpbin.org/html",
];

export function RunForm({
  onSubmit,
  isDisabled = false,
  error,
  urlInputRef,
  onTargetContextChange,
}: RunFormProps) {
  const [url, setUrl] = useState("");
  const [runConfig, setRunConfig] = useState<RunConfig>({ mode: "single" });

  // Project & Environment selection state
  const [projects, setProjects] = useState<ProjectWithEnvironments[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState<string>("");

  useEffect(() => {
    async function loadProjects() {
      try {
        const data = await getProjects();
        setProjects(data.projects as unknown as ProjectWithEnvironments[]);
      } catch {
        // Safe fallback if projects catalog fetch fails
      }
    }
    loadProjects();
  }, []);

  const activeProject = projects.find((p) => p.id === selectedProjectId);
  const availableEnvironments = activeProject ? activeProject.environments : [];

  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    setSelectedEnvironmentId("");
    onTargetContextChange?.(projectId || undefined, undefined);
  };

  const handleEnvironmentChange = (envId: string) => {
    setSelectedEnvironmentId(envId);
    onTargetContextChange?.(selectedProjectId || undefined, envId || undefined);
    if (!envId) return;

    const env = availableEnvironments.find((e) => e.id === envId);
    if (env?.baseUrl && !url.trim()) {
      setUrl(env.baseUrl);
    }
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!url.trim()) return;

    const finalConfig: RunConfig = {
      ...runConfig,
      projectId: selectedProjectId || undefined,
      environmentId: selectedEnvironmentId || undefined,
      origin: "manual",
    };

    onSubmit(url.trim(), finalConfig);
  };

  return (
    <section className="rounded-xs border border-border/80 bg-panel/90 p-5 shadow-sm">
      <form aria-label="Create browser run" onSubmit={handleFormSubmit}>
        {/* Project & Environment Target Context Bar */}
        <div className="mb-4 p-3.5 rounded-xs border border-border/70 bg-card/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <FolderGit2 className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Target Context:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 flex-1 max-w-md">
            <select
              aria-label="Select Project"
              value={selectedProjectId}
              onChange={(e) => handleProjectChange(e.target.value)}
              disabled={isDisabled}
              className="px-3 py-1.5 bg-card border border-border rounded-xs text-xs font-medium text-foreground outline-none transition focus:border-amber-500 focus:ring-1 focus:ring-amber-500 disabled:opacity-50 cursor-pointer"
            >
              <option value="">No Project (Ad-hoc run)</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            {selectedProjectId && (
              <select
                aria-label="Select Environment"
                value={selectedEnvironmentId}
                onChange={(e) => handleEnvironmentChange(e.target.value)}
                disabled={isDisabled || availableEnvironments.length === 0}
                className="px-3 py-1.5 bg-card border border-border rounded-xs text-xs font-medium text-foreground outline-none transition focus:border-amber-500 focus:ring-1 focus:ring-amber-500 disabled:opacity-50 cursor-pointer"
              >
                <option value="">Select Environment...</option>
                {availableEnvironments.map((env) => (
                  <option key={env.id} value={env.id}>
                    {env.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <Link
            href={HELIOS_ROUTES.projects()}
            className="rounded-xs border border-border px-2.5 py-1 text-xs text-muted hover:text-foreground transition flex items-center gap-1 self-end sm:self-auto"
          >
            <span>Manage projects</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

        <div className="flex items-center justify-between">
          <label
            htmlFor="url-target"
            className="text-sm font-semibold text-foreground flex items-center gap-2"
          >
            <span>Starting URL</span>
            <kbd className="rounded-xs border border-border bg-card px-1.5 py-0.5 text-[10px] font-mono text-muted">
              Alt + R
            </kbd>
          </label>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted">
            <span>Presets:</span>
            {PRESET_URLS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setUrl(preset)}
                disabled={isDisabled}
                className="rounded-xs border border-border/60 bg-card px-2 py-0.5 text-[11px] text-muted hover:text-foreground hover:border-border transition disabled:opacity-50"
              >
                {preset.replace("https://", "")}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-2.5 flex flex-col sm:flex-row gap-3">
          <input
            type="url"
            name="url"
            id="url-target"
            ref={urlInputRef}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1 w-full rounded-xs border border-border bg-card px-3.5 py-2.5 text-sm text-foreground outline-none transition disabled:cursor-not-allowed disabled:opacity-60 focus:border-accent focus:ring-1 focus:ring-accent"
            placeholder="https://example.com"
            disabled={isDisabled}
            aria-invalid={Boolean(error)}
            aria-describedby={
              error
                ? "run-form-description run-form-error"
                : "run-form-description"
            }
            aria-keyshortcuts="Alt+R"
            required
          />
          <button
            className="rounded-xs bg-accent px-5 py-2.5 text-sm font-semibold text-background sm:w-auto disabled:cursor-not-allowed disabled:opacity-70 transition hover:opacity-95 active:scale-[0.99] shadow-sm"
            type="submit"
            disabled={isDisabled}
          >
            {isDisabled ? "Running QA Check..." : "Run QA Check"}
          </button>
        </div>

        <RunOptionsPicker onChange={setRunConfig} isDisabled={isDisabled} />

        <p id="run-form-description" className="mt-3 text-xs text-muted">
          Launches a Playwright browser check capturing screenshots, network egress, console logs, and QA metrics.
        </p>
      </form>

      {error ? (
        <div
          id="run-form-error"
          role="alert"
          className="mt-4 rounded-xs border border-danger/40 bg-danger/10 p-3.5"
        >
          <p className="text-sm font-semibold text-danger">Run failed</p>
          <p className="mt-0.5 text-xs text-muted">{error}</p>
        </div>
      ) : null}
    </section>
  );
}
