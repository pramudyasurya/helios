"use client";

import { useState } from "react";
import type { EvidenceType, LatestRun } from "@/lib/helios/shared/types";
import { type TabItem, Tabs } from "@/components/helios/ui/tabs";
import { RunOverview } from "@/components/helios/run/run-overview";
import {
  RunEvidenceList,
  type EvidenceFilter,
} from "@/components/helios/evidence/run-evidence-list";
import { RunChecksList } from "@/components/helios/run/run-checks-list";
import { BrowserTrail } from "@/components/helios/run/browser-trail";
import { RunFindingsSummary } from "@/components/helios/run/run-findings-summary";
import { getFindingsFromChecks } from "@/lib/helios/shared/findings";

type RunDetailTabsProps = {
  run: LatestRun;
};

const evidenceFilterByType: Record<EvidenceType, EvidenceFilter> = {
  image: "images",
  console: "console",
  network: "network",
};

export function RunDetailTabs({ run }: RunDetailTabsProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [activeEvidenceFilter, setActiveEvidenceFilter] =
    useState<EvidenceFilter>("all");
  const findingCount = getFindingsFromChecks(run.checks).length;

  const handleViewEvidence = (evidenceType: EvidenceType) => {
    setActiveEvidenceFilter(evidenceFilterByType[evidenceType]);
    setActiveTab("evidence");
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
      id: "findings",
      label: `Findings (${findingCount})`,
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
      label: "Evidence",
      content: (
        <RunEvidenceList
          key={activeEvidenceFilter}
          runId={run.id}
          capturedAt={run.finishedAt ?? run.createdAt}
          pageUrl={run.finalUrl ?? run.startingUrl}
          brokenImages={run.brokenImages}
          consoleErrors={run.consoleErrors}
          failedRequests={run.failedRequests}
          activeFilter={activeEvidenceFilter}
          onFilterChange={(filter) => setActiveEvidenceFilter(filter)}
        />
      ),
    },
    {
      id: "checks",
      label: "QA Checks",
      content: (
        <RunChecksList
          checks={run.checks}
          onViewEvidence={handleViewEvidence}
        />
      ),
    },
    {
      id: "trail",
      label: "Browser Trail",
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
