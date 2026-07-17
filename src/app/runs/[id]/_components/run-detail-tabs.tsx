"use client";

import { useState } from "react";
import { updateEvidenceStatus } from "@/lib/client/api";
import type {
  EvidenceStatus,
  EvidenceType,
  LatestRun,
} from "@/lib/shared/domain/types";
import { type TabItem, Tabs } from "@/components/ui/tabs";
import { RunOverview } from "@/components/features/run-overview";
import { RunEvidenceList } from "@/app/runs/[id]/_components/run-evidence-list";
import { type EvidenceFilter } from "@/lib/shared/domain/evidence-sections";
import { RunChecksList } from "@/app/runs/[id]/_components/run-checks-list";
import { BrowserTrail } from "@/app/runs/[id]/_components/browser-trail";
import { RunFindingsSummary } from "@/app/runs/[id]/_components/run-findings-summary";
import { getFindingsFromChecks } from "@/lib/shared/domain/findings";
import { AIReportPanel } from "@/components/features/ai-report-panel";

type RunDetailTabsProps = {
  run: LatestRun;
};

const evidenceFilterByType: Record<EvidenceType, EvidenceFilter> = {
  image: "images",
  console: "console",
  network: "network",
};

function formatTabLabel(label: string, count: number) {
  return count > 0 ? `${label} (${count})` : label;
}

export function RunDetailTabs({ run }: RunDetailTabsProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [activeEvidenceFilter, setActiveEvidenceFilter] =
    useState<EvidenceFilter>("all");
  const [scrollTarget, setScrollTarget] = useState<EvidenceFilter | null>(null);
  const [evidence, setEvidence] = useState(run.evidence ?? []);
  const findingCount = getFindingsFromChecks(run.checks).length;
  const evidenceCount = evidence.length;
  const checksCount = run.checks.length;
  const trailCount = run.trail.length;

  const handleViewEvidence = (evidenceType: EvidenceType) => {
    const filter = evidenceFilterByType[evidenceType];
    setActiveEvidenceFilter(filter);
    setScrollTarget(filter);
    setActiveTab("evidence");
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

  const tabs: TabItem[] = [
    {
      id: "overview",
      label: "Overview",
      content: (
        <div className="space-y-4">
          <RunOverview run={run} />
          <RunFindingsSummary
            checks={run.checks}
            onViewEvidence={handleViewEvidence}
          />
        </div>
      ),
    },
    {
      id: "ai-report",
      label: "AI Report",
      content: <AIReportPanel runId={run.id} initialReport={run.report} />,
    },
    {
      id: "findings",
      label: formatTabLabel("Findings", findingCount),
      content: (
        <RunFindingsSummary
          checks={run.checks}
          onViewEvidence={handleViewEvidence}
          showEmptyState
        />
      ),
    },
    {
      id: "evidence",
      label: formatTabLabel("Evidence", evidenceCount),
      content: (
        <RunEvidenceList
          key={activeEvidenceFilter}
          evidence={evidence}
          onStatusChange={handleUpdateEvidenceStatus}
          activeFilter={activeEvidenceFilter}
          onFilterChange={(filter) => setActiveEvidenceFilter(filter)}
          scrollTarget={scrollTarget}
          onScrollComplete={handleScrollComplete}
        />
      ),
    },
    {
      id: "checks",
      label: formatTabLabel("QA Checks", checksCount),
      content: (
        <RunChecksList
          checks={run.checks}
          onViewEvidence={handleViewEvidence}
        />
      ),
    },
    {
      id: "trail",
      label: formatTabLabel("Trail", trailCount),
      content: <BrowserTrail trail={run.trail} />,
    },
  ];

  return (
    <Tabs
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={(tabId) => setActiveTab(tabId)}
    />
  );
}
