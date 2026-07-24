"use client";

import { useState } from "react";
import { updateEvidenceStatus } from "@/lib/client/api";
import type {
  EvidenceStatus,
  EvidenceType,
  LatestRun,
} from "@/lib/shared/domain/types";
import { RunOverview } from "@/components/features/run-overview";
import { RunEvidenceList } from "@/app/runs/[id]/_components/run-evidence-list";
import { type EvidenceFilter } from "@/lib/shared/domain/evidence-sections";
import { RunChecksList } from "@/app/runs/[id]/_components/run-checks-list";
import { BrowserTrail } from "@/app/runs/[id]/_components/browser-trail";
import { RunFindingsSummary } from "@/app/runs/[id]/_components/run-findings-summary";
import { getFindingsFromChecks } from "@/lib/shared/domain/findings";
import { AIReportPanel } from "@/components/features/ai-report-panel";
import { PageResultsTab } from "@/app/runs/[id]/_components/page-results-tab";
import {
  RunDetailSidebar,
  type RunDetailSectionId,
} from "@/app/runs/[id]/_components/run-detail-sidebar";

type RunDetailTabsProps = {
  run: LatestRun;
};

const evidenceFilterByType: Record<EvidenceType, EvidenceFilter> = {
  image: "images",
  console: "console",
  network: "network",
};

export function RunDetailTabs({ run }: RunDetailTabsProps) {
  const [activeSection, setActiveSection] = useState<RunDetailSectionId>("overview");
  const [activeEvidenceFilter, setActiveEvidenceFilter] =
    useState<EvidenceFilter>("all");
  const [scrollTarget, setScrollTarget] = useState<EvidenceFilter | null>(null);
  const [evidence, setEvidence] = useState(run.evidence ?? []);
  const findingCount = getFindingsFromChecks(run.checks).length;
  const evidenceCount = evidence.length;
  const checksCount = run.checks.length;
  const trailCount = run.trail.length;
  const pageResultsCount = run.pageResults?.length ?? 0;

  const handleViewEvidence = (evidenceType: EvidenceType) => {
    const filter = evidenceFilterByType[evidenceType];
    setActiveEvidenceFilter(filter);
    setScrollTarget(filter);
    setActiveSection("evidence");
  };

  const handleScrollComplete = () => {
    setScrollTarget(null);
  };

  const handleUpdateEvidenceStatus = async (
    evidenceId: string,
    newStatus: EvidenceStatus,
  ) => {
    const originalEvidence = [...evidence];

    setEvidence((prev) =>
      prev.map((item) =>
        item.id === evidenceId
          ? {
              ...item,
              status: newStatus,
            }
          : item,
      ),
    );

    try {
      await updateEvidenceStatus(run.id, evidenceId, newStatus);
    } catch (error) {
      console.error("Failed to update evidence status:", error);
      setEvidence(originalEvidence);
    }
  };

  const renderActiveSection = () => {
    switch (activeSection) {
      case "overview":
        return (
          <div className="space-y-4">
            <RunOverview run={run} />
            <RunFindingsSummary
              checks={run.checks}
              onViewEvidence={handleViewEvidence}
            />
          </div>
        );
      case "ai-report":
        return <AIReportPanel runId={run.id} initialReport={run.report} />;
      case "pages":
        return <PageResultsTab pageResults={run.pageResults} />;
      case "findings":
        return (
          <RunFindingsSummary
            checks={run.checks}
            onViewEvidence={handleViewEvidence}
            showEmptyState
          />
        );
      case "evidence":
        return (
          <RunEvidenceList
            key={activeEvidenceFilter}
            evidence={evidence}
            onStatusChange={handleUpdateEvidenceStatus}
            activeFilter={activeEvidenceFilter}
            onFilterChange={(filter) => setActiveEvidenceFilter(filter)}
            scrollTarget={scrollTarget}
            onScrollComplete={handleScrollComplete}
          />
        );
      case "checks":
        return (
          <RunChecksList
            checks={run.checks}
            onViewEvidence={handleViewEvidence}
          />
        );
      case "trail":
        return <BrowserTrail trail={run.trail} />;
      default:
        return null;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
      <div className="md:col-span-3 md:sticky md:top-20 self-start z-10">
        <RunDetailSidebar
          activeSection={activeSection}
          onSelectSection={(id) => setActiveSection(id)}
          counts={{
            pageResults: pageResultsCount,
            findings: findingCount,
            evidence: evidenceCount,
            checks: checksCount,
            trail: trailCount,
          }}
          hasReport={Boolean(run.report)}
        />
      </div>

      <div className="md:col-span-9 min-w-0">
        <div className="rounded-xl border border-border/80 bg-panel/90 p-5 shadow-sm">
          {renderActiveSection()}
        </div>
      </div>
    </div>
  );
}
