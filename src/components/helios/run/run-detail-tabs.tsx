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

  const handleViewEvidence = (evidenceType: EvidenceType) => {
    setActiveEvidenceFilter(evidenceFilterByType[evidenceType]);
    setActiveTab("evidence");
  };

  const tabs: TabItem[] = [
    {
      id: "overview",
      label: "Overview",
      content: <RunOverview run={run} />,
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
