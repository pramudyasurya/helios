"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FolderPlus, Globe, Plus, Server, ShieldCheck } from "lucide-react";
import { AppHeader } from "@/components/shared/app-header";
import type { ProjectWithEnvironments } from "@/lib/shared/domain/types";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectWithEnvironments[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states for project creation
  const [projectName, setProjectName] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);
  const [projectError, setProjectError] = useState<string | null>(null);

  // Form states for environment creation
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [envName, setEnvName] = useState("");
  const [envBaseUrl, setEnvBaseUrl] = useState("");
  const [creatingEnv, setCreatingEnv] = useState(false);
  const [envError, setEnvError] = useState<string | null>(null);

  async function fetchProjects() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/projects");
      if (!res.ok) {
        throw new Error("Failed to fetch projects");
      }
      const data = await res.json();
      setProjects(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProjects();
  }, []);

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    if (!projectName.trim()) return;

    try {
      setCreatingProject(true);
      setProjectError(null);
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: projectName.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create project");
      }

      setProjectName("");
      await fetchProjects();
    } catch (err) {
      setProjectError(err instanceof Error ? err.message : "Error creating project");
    } finally {
      setCreatingProject(false);
    }
  }

  async function handleCreateEnvironment(projectId: string, e: React.FormEvent) {
    e.preventDefault();
    if (!envName.trim()) return;

    try {
      setCreatingEnv(true);
      setEnvError(null);
      const res = await fetch(`/api/projects/${projectId}/environments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: envName.trim(),
          baseUrl: envBaseUrl.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create environment");
      }

      setEnvName("");
      setEnvBaseUrl("");
      setSelectedProjectId(null);
      await fetchProjects();
    } catch (err) {
      setEnvError(err instanceof Error ? err.message : "Error creating environment");
    } finally {
      setCreatingEnv(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <AppHeader />
      <div className="py-8 px-4 sm:px-6 mx-auto max-w-7xl space-y-8">
        {/* Hero Header Card matching DashboardHero */}
        <header className="rounded-xl border border-border/80 bg-linear-to-r from-panel/90 via-panel/70 to-card/60 px-6 py-5 sm:py-6 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Dashboard
            </Link>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl text-foreground flex items-center gap-2.5">
            <FolderPlus className="w-7 h-7 text-amber-500" />
            Projects & Environments
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-muted leading-relaxed max-w-2xl">
            Organize browser QA checks under structured projects and target environments.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create Project Panel */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-panel/90 border border-border/80 rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-500" />
                <h2 className="text-sm font-semibold text-foreground">Create Project</h2>
              </div>
              <p className="text-xs text-muted">
                Projects group related web applications or services.
              </p>

              <form onSubmit={handleCreateProject} className="space-y-4">
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
                    onChange={(e) => setProjectName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted outline-none transition focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    required
                  />
                </div>

                {projectError && (
                  <div role="alert" className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs">
                    {projectError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={creatingProject || !projectName.trim()}
                  className="w-full py-2.5 px-4 bg-amber-500 text-black font-semibold rounded-lg text-xs hover:bg-amber-400 disabled:opacity-50 transition shadow-xs flex items-center justify-center gap-2"
                >
                  {creatingProject ? "Creating..." : "Create Project"}
                </button>
              </form>
            </div>
          </div>

          {/* Projects List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Server className="w-4 h-4 text-muted" />
                Configured Projects ({projects.length})
              </h2>
            </div>

            {loading ? (
              <div className="bg-panel/90 border border-border/80 rounded-xl p-8 text-center text-xs text-muted animate-pulse">
                Loading projects catalog...
              </div>
            ) : error ? (
              <div className="bg-panel/90 border border-red-500/30 rounded-xl p-6 text-center text-xs text-red-400">
                {error}
              </div>
            ) : projects.length === 0 ? (
              <div className="bg-panel/90 border border-border/80 rounded-xl p-12 text-center space-y-3">
                <FolderPlus className="w-10 h-10 text-muted mx-auto opacity-50" />
                <p className="text-sm font-medium text-foreground">No projects yet</p>
                <p className="text-xs text-muted max-w-sm mx-auto">
                  Create your first project on the left to start grouping environments and targeted QA runs.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className="bg-panel/90 border border-border/80 rounded-xl p-6 shadow-sm space-y-5"
                  >
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
                        onClick={() =>
                          setSelectedProjectId(
                            selectedProjectId === project.id ? null : project.id
                          )
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border border-border bg-card text-muted hover:text-foreground transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Environment
                      </button>
                    </div>

                    {/* Environment Creation Form for this project */}
                    {selectedProjectId === project.id && (
                      <form
                        onSubmit={(e) => handleCreateEnvironment(project.id, e)}
                        className="p-4 bg-card/60 border border-amber-500/30 rounded-lg space-y-4"
                      >
                        <h4 className="text-xs font-semibold text-amber-500 uppercase tracking-wider">
                          Add Environment to {project.name}
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label
                              htmlFor={`envName-${project.id}`}
                              className="block text-xs font-medium text-muted mb-1"
                            >
                              Environment Name *
                            </label>
                            <input
                              id={`envName-${project.id}`}
                              type="text"
                              placeholder="e.g. Staging, Production"
                              value={envName}
                              onChange={(e) => setEnvName(e.target.value)}
                              className="w-full px-3 py-2 bg-background border border-border rounded-md text-xs text-foreground focus:outline-none focus:border-amber-500"
                              required
                            />
                          </div>
                          <div>
                            <label
                              htmlFor={`envUrl-${project.id}`}
                              className="block text-xs font-medium text-muted mb-1"
                            >
                              Base URL (Optional)
                            </label>
                            <input
                              id={`envUrl-${project.id}`}
                              type="url"
                              placeholder="https://staging.example.com"
                              value={envBaseUrl}
                              onChange={(e) => setEnvBaseUrl(e.target.value)}
                              className="w-full px-3 py-2 bg-background border border-border rounded-md text-xs text-foreground focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>

                        {envError && (
                          <div role="alert" className="p-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded text-xs">
                            {envError}
                          </div>
                        )}

                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedProjectId(null)}
                            className="px-3 py-1.5 text-xs text-muted hover:text-foreground transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={creatingEnv || !envName.trim()}
                            className="px-3 py-1.5 bg-amber-500 text-black font-semibold rounded text-xs hover:bg-amber-400 disabled:opacity-50 transition-colors"
                          >
                            {creatingEnv ? "Saving..." : "Save Environment"}
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Environments list */}
                    {project.environments.length === 0 ? (
                      <p className="text-xs text-muted italic">
                        No environments configured for this project.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {project.environments.map((env) => (
                          <div
                            key={env.id}
                            className="p-3 bg-card/60 border border-border/70 rounded-lg flex items-start justify-between gap-2"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                                <span className="text-xs font-semibold text-foreground">
                                  {env.name}
                                </span>
                              </div>
                              {env.baseUrl ? (
                                <a
                                  href={env.baseUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[11px] text-muted hover:text-amber-500 flex items-center gap-1 font-mono truncate transition-colors"
                                >
                                  <Globe className="w-3 h-3 flex-shrink-0" />
                                  <span className="truncate">{env.baseUrl}</span>
                                </a>
                              ) : (
                                <span className="text-[11px] text-muted/60 italic block">
                                  No base URL specified
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
