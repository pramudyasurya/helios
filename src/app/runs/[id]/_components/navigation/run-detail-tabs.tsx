"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateEvidenceStatus } from "@/lib/client/api";
import type {
  EvidenceStatus,
  EvidenceType,
  LatestRun,
} from "@/lib/shared/domain/types";
import { normalizeRunStatus } from "@/lib/shared/domain/format";
import { RunOverview } from "@/app/runs/[id]/_components/overview/run-overview";
import { RunEvidenceList } from "@/app/runs/[id]/_components/evidence/run-evidence-list";
import { type EvidenceFilter } from "@/lib/shared/domain/evidence-sections";
import { RunChecksList } from "@/app/runs/[id]/_components/findings/run-checks-list";
import { BrowserTrail } from "@/app/runs/[id]/_components/findings/browser-trail";
import { RunFindingsSummary } from "@/app/runs/[id]/_components/findings/run-findings-summary";
import { getFindingsFromChecks } from "@/lib/shared/domain/findings";
import { AIReportPanel } from "@/components/features/ai-report-panel";
import { PageResultsTab } from "@/app/runs/[id]/_components/findings/page-results-tab";
import {
  RunDetailSidebar,
  type RunDetailSectionId,
} from "@/app/runs/[id]/_components/navigation/run-detail-sidebar";

type RunDetailTabsProps = {
  run: LatestRun;
};

const evidenceFilterByType: Record<EvidenceType, EvidenceFilter> = {
  image: "images",
  console: "console",
  network: "network",
};

const RUN_DETAIL_REFRESH_INTERVAL_MS = 3_000;

export function RunDetailTabs({ run }: RunDetailTabsProps) {
  const router = useRouter();
  const [isRefreshPending, startRefreshTransition] = useTransition();
  const [activeSection, setActiveSection] = useState<RunDetailSectionId>("overview");
  const [activeEvidenceFilter, setActiveEvidenceFilter] =
    useState<EvidenceFilter>("all");
  const [scrollTarget, setScrollTarget] = useState<EvidenceFilter | null>(null);
  const [evidence, setEvidence] = useState(run.evidence ?? []);

  useEffect(() => {
    const normalized = normalizeRunStatus(run.status);
    if (normalized !== "Queued" && normalized !== "Running") {
      return;
    }

    let timerId: ReturnType<typeof setTimeout> | null = null;

    const scheduleNext = () => {
      if (timerId) clearTimeout(timerId);
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }

      timerId = setTimeout(() => {
        if (isRefreshPending) {
          scheduleNext();
          return;
        }

        startRefreshTransition(() => router.refresh());
      }, RUN_DETAIL_REFRESH_INTERVAL_MS);
    };

    const handleVisibilityChange = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        scheduleNext();
      } else if (timerId) {
        clearTimeout(timerId);
      }
    };

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }
    scheduleNext();

    return () => {
      if (timerId) clearTimeout(timerId);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
    };
  }, [isRefreshPending, run.id, run.status, router, startRefreshTransition]);

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
    <div className="space-y-4 w-full">
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

      <div className="rounded-xs border border-border/80 bg-panel/90 p-5 shadow-sm">
        {renderActiveSection()}
      </div>
    </div>
  );
}
