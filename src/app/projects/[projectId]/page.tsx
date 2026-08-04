"use client";

import { use, useEffect, useState } from "react";
import { Shield, PlayCircle, Settings, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/shared/app-shell";
import { Tabs } from "@/components/ui/tabs";
import { ProjectDetailHeader } from "./_components/project-detail-header";
import { ProjectEnvironmentsTab } from "./_components/project-environments-tab";
import { ProjectRunsTab } from "./_components/project-runs-tab";
import { ProjectSettingsTab } from "./_components/project-settings-tab";
import { getProject, type ProjectDetailDto } from "@/lib/client/api";

type ProjectDetailPageProps = {
  params: Promise<{ projectId: string }>;
};

export default function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { projectId } = use(params);

  const [project, setProject] = useState<ProjectDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("environments");

  async function loadProject() {
    try {
      setLoading(true);
      setError(null);
      const data = await getProject(projectId);
      setProject(data);
    } catch (err: unknown) {
      const msg =
        typeof err === "object" && err !== null && "message" in err
          ? (err as { message: string }).message
          : "Failed to load project detail.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProject();
  }, [projectId]);

  const tabItems = [
    {
      id: "environments",
      label: "Environments",
      icon: <Shield className="h-4 w-4" />,
    },
    {
      id: "runs",
      label: "Run History",
      icon: <PlayCircle className="h-4 w-4" />,
    },
    {
      id: "settings",
      label: "Settings",
      icon: <Settings className="h-4 w-4" />,
    },
  ];

  return (
    <AppShell activeTab="projects">
      <main className="py-8 px-4 sm:px-6 mx-auto max-w-7xl space-y-6">
        {loading ? (
          <div className="space-y-6 animate-pulse">
            <div className="h-4 bg-card rounded-xs w-32" />
            <div className="h-32 bg-panel rounded-xs w-full" />
            <div className="h-10 bg-card rounded-xs w-64" />
            <div className="h-64 bg-panel rounded-xs w-full" />
          </div>
        ) : error || !project ? (
          <div className="p-8 rounded-xs bg-panel border border-border space-y-4 text-center">
            <AlertCircle className="h-10 w-10 text-danger mx-auto" />
            <div>
              <h2 className="text-lg font-bold text-foreground">Project Not Found</h2>
              <p className="text-xs text-muted mt-1">{error || "The requested project does not exist."}</p>
            </div>
            <Link
              href="/projects"
              className="inline-flex items-center space-x-2 px-4 py-2 text-xs font-semibold text-foreground bg-card hover:bg-panel border border-border rounded-xs transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Projects Directory</span>
            </Link>
          </div>
        ) : (
          <>
            {/* Header Hero */}
            <ProjectDetailHeader project={project} />

            {/* Navigation Tabs */}
            <div className="border-b border-border/60 pb-4">
              <Tabs
                items={tabItems}
                activeTab={activeTab}
                onChange={setActiveTab}
              />
            </div>

            {/* Tab Content */}
            {activeTab === "environments" && (
              <ProjectEnvironmentsTab project={project} onRefresh={loadProject} />
            )}

            {activeTab === "runs" && <ProjectRunsTab project={project} />}

            {activeTab === "settings" && (
              <ProjectSettingsTab project={project} onRefresh={loadProject} />
            )}
          </>
        )}
      </main>
    </AppShell>
  );
}
