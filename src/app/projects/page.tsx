"use client";

import { useEffect, useState, useTransition } from "react";
import { Plus, Search, AlertCircle } from "lucide-react";
import { AppShell } from "@/components/shared/app-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { ProjectsHeader } from "./_components/projects-header";
import { ProjectsStatsBar } from "./_components/projects-stats-bar";
import { ProjectCard } from "./_components/project-card";
import { ProjectModal } from "@/components/features/projects/project-modal";
import { EnvironmentModal } from "@/components/features/projects/environment-modal";
import { DeleteConfirmationModal } from "@/components/features/projects/delete-confirmation-modal";
import {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  createEnvironment,
  updateEnvironment,
  type ProjectDto,
  type EnvironmentDto,
} from "@/lib/client/api";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [, startTransition] = useTransition();

  // Modals state
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<ProjectDto | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<{ id: string; name: string } | null>(null);

  const [isEnvModalOpen, setIsEnvModalOpen] = useState(false);
  const [envProject, setEnvProject] = useState<ProjectDto | null>(null);
  const [envToEdit, setEnvToEdit] = useState<EnvironmentDto | null>(null);

  async function loadProjects(query?: string) {
    try {
      setLoading(true);
      setError(null);
      const data = await getProjects({ q: query });
      setProjects(data.projects);
    } catch (err: unknown) {
      const msg =
        typeof err === "object" && err !== null && "message" in err
          ? (err as { message: string }).message
          : "Failed to load projects.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProjects();
  }, []);

  function handleSearchChange(val: string) {
    setSearchQuery(val);
    startTransition(() => {
      loadProjects(val);
    });
  }

  // Project Modal Actions
  function openCreateProject() {
    setProjectToEdit(null);
    setIsProjectModalOpen(true);
  }

  function openEditProject(proj: ProjectDto) {
    setProjectToEdit(proj);
    setIsProjectModalOpen(true);
  }

  async function handleSaveProject(name: string) {
    if (projectToEdit) {
      await updateProject(projectToEdit.id, { name });
    } else {
      await createProject({ name });
    }
    await loadProjects(searchQuery);
  }

  function handleDeleteProjectPrompt(id: string, name: string) {
    setProjectToDelete({ id, name });
  }

  async function handleConfirmDeleteProject() {
    if (!projectToDelete) return;
    await deleteProject(projectToDelete.id);
    setProjectToDelete(null);
    await loadProjects(searchQuery);
  }

  // Environment Modal Actions
  function openAddEnvironment(proj: ProjectDto) {
    setEnvProject(proj);
    setEnvToEdit(null);
    setIsEnvModalOpen(true);
  }

  function openEditEnvironment(proj: ProjectDto, env: EnvironmentDto) {
    setEnvProject(proj);
    setEnvToEdit(env);
    setIsEnvModalOpen(true);
  }

  async function handleSaveEnvironment(data: {
    name: string;
    baseUrl?: string | null;
  }) {
    if (!envProject) return;

    if (envToEdit) {
      await updateEnvironment(envProject.id, envToEdit.id, data);
    } else {
      await createEnvironment(envProject.id, {
        name: data.name,
        baseUrl: data.baseUrl || undefined,
      });
    }
    await loadProjects(searchQuery);
  }

  return (
    <AppShell activeTab="projects">
      <main className="py-8 px-4 sm:px-6 mx-auto max-w-7xl space-y-6">
        {/* Header section with Action Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <ProjectsHeader />
          </div>
          <button
            type="button"
            onClick={openCreateProject}
            className="rounded-xs border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer inline-flex items-center justify-center space-x-1.5 shrink-0 sm:self-start mt-1"
          >
            <Plus className="h-4 w-4 text-muted" />
            <span>New Project</span>
          </button>
        </div>

        {/* Directory Stats Bar */}
        <ProjectsStatsBar projects={projects} />

        {/* Filter & Search Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xs border border-border/80 bg-panel/90 p-4 shadow-xs">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search projects by name or slug..."
              className="w-full pl-9 pr-3 py-1.5 bg-card border border-border rounded-xs text-foreground placeholder:text-muted/60 focus:border-accent focus:outline-hidden text-xs transition-all font-mono"
            />
          </div>
          <div className="text-xs font-mono text-muted">
            Showing <span className="text-foreground font-semibold">{projects.length}</span> projects
          </div>
        </div>

        {/* Content Section */}
        {error && (
          <div className="p-4 rounded-xs bg-danger/10 border border-danger/30 text-danger flex items-start space-x-3 text-xs">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Unable to load projects</p>
              <p className="opacity-90">{error}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-panel/90 border border-border/80 rounded-xs p-5 h-56 animate-pulse flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="h-5 bg-card rounded-xs w-2/3" />
                  <div className="h-3.5 bg-card rounded-xs w-1/3" />
                </div>
                <div className="h-8 bg-card rounded-xs w-full" />
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="py-12 bg-panel/40 border border-border/60 rounded-xs">
            <EmptyState
              title={searchQuery ? "No matching projects found" : "No projects configured"}
              description={
                searchQuery
                  ? `No project matched "${searchQuery}". Try a different keyword.`
                  : "Organize your QA test runs across different projects and staging/production environments."
              }
              actionLabel={searchQuery ? undefined : "Create First Project"}
              onAction={searchQuery ? undefined : openCreateProject}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onEditProject={openEditProject}
                onDeleteProject={handleDeleteProjectPrompt}
                onAddEnvironment={openAddEnvironment}
                onEditEnvironment={openEditEnvironment}
              />
            ))}
          </div>
        )}
      </main>

      {/* Modals */}
      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onSave={handleSaveProject}
        projectToEdit={projectToEdit}
      />

      <EnvironmentModal
        isOpen={isEnvModalOpen}
        onClose={() => setIsEnvModalOpen(false)}
        onSave={handleSaveEnvironment}
        projectName={envProject?.name}
        envToEdit={envToEdit}
      />

      <DeleteConfirmationModal
        isOpen={Boolean(projectToDelete)}
        onClose={() => setProjectToDelete(null)}
        onConfirm={handleConfirmDeleteProject}
        targetName={projectToDelete?.name || ""}
        resourceType="Project"
      />
    </AppShell>
  );
}
