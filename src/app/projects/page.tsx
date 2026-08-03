"use client";

import { useEffect, useState } from "react";
import { FolderPlus, Server } from "lucide-react";
import { AppShell } from "@/components/shared/app-shell";
import type { ProjectWithEnvironments } from "@/lib/shared/domain/types";
import { ProjectsHeader } from "./_components/projects-header";
import { CreateProjectCard } from "./_components/create-project-card";
import { ProjectItemCard } from "./_components/project-item-card";

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
    <AppShell>
      <main className="py-8 px-4 sm:px-6 mx-auto max-w-7xl space-y-8">
        <ProjectsHeader />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create Project Panel */}
          <div className="lg:col-span-1 space-y-6">
            <CreateProjectCard
              projectName={projectName}
              onProjectNameChange={setProjectName}
              onSubmit={handleCreateProject}
              isSubmitting={creatingProject}
              error={projectError}
            />
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
              <div className="bg-panel/90 border border-danger/30 rounded-xl p-6 text-center text-xs text-danger">
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
                  <ProjectItemCard
                    key={project.id}
                    project={project}
                    isSelectedForEnv={selectedProjectId === project.id}
                    onToggleAddEnv={() =>
                      setSelectedProjectId(
                        selectedProjectId === project.id ? null : project.id
                      )
                    }
                    envName={envName}
                    envBaseUrl={envBaseUrl}
                    onEnvNameChange={setEnvName}
                    onEnvBaseUrlChange={setEnvBaseUrl}
                    onSaveEnv={(e) => handleCreateEnvironment(project.id, e)}
                    isSubmittingEnv={creatingEnv}
                    envError={envError}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </AppShell>
  );
}
