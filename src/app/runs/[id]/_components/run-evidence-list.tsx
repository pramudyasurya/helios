"use client";
import { useState, useMemo, useEffect } from "react";
import {
  COPY_FEEDBACK_TIMEOUT_MS,
  MAX_VISIBLE_EVIDENCE_ITEMS,
} from "@/lib/shared/domain/constants";
import type { EvidenceStatus, RunEvidence } from "@/lib/shared/domain/types";

import { EvidenceSection } from "@/app/runs/[id]/_components/evidence-section";
import { EmptyState } from "@/components/ui/empty-state";
import { CheckCircle } from "lucide-react";
import { EvidenceDetailModal } from "@/app/runs/[id]/_components/evidence-detail-modal";
import {
  type EvidenceFilter,
  getEvidenceSections,
  canToggleEvidence,
  getVisibleEvidenceText,
} from "@/lib/shared/domain/evidence-sections";

type RunEvidenceListProps = {
  evidence: RunEvidence[];
  activeFilter?: EvidenceFilter;
  onFilterChange?: (filter: EvidenceFilter) => void;
  scrollTarget?: EvidenceFilter | null;
  onScrollComplete?: () => void;
  onStatusChange?: (evidenceId: string, newStatus: EvidenceStatus) => void;
};

export function RunEvidenceList({
  evidence,
  activeFilter: controlledActiveFilter,
  onFilterChange,
  scrollTarget,
  onScrollComplete,
  onStatusChange,
}: RunEvidenceListProps) {
  const [showAllEvidence, setShowAllEvidence] = useState(false);
  const [copiedEvidence, setCopiedEvidence] = useState<string | null>(null);
  const [hasCopiedAllEvidence, setHasCopiedAllEvidence] = useState(false);
  const [uncontrolledActiveFilter, setUncontrolledActiveFilter] =
    useState<EvidenceFilter>("all");
  const [selectedEvidence, setSelectedEvidence] = useState<RunEvidence | null>(
    null,
  );

  const activeFilter = controlledActiveFilter ?? uncontrolledActiveFilter;

  useEffect(() => {
    if (!scrollTarget) return;

    const scrollTimeoutId = window.setTimeout(() => {
      const element = document.getElementById(
        `evidence-section-${scrollTarget}`,
      );
      element?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 200);

    const highlightTimeoutId = window.setTimeout(() => {
      onScrollComplete?.();
    }, 1400);

    return () => {
      window.clearTimeout(scrollTimeoutId);
      window.clearTimeout(highlightTimeoutId);
    };
  }, [scrollTarget, onScrollComplete]);

  const handleFilterChange = (filter: EvidenceFilter) => {
    if (controlledActiveFilter === undefined) {
      setUncontrolledActiveFilter(filter);
    }

    onFilterChange?.(filter);
    setShowAllEvidence(false);
    setHasCopiedAllEvidence(false);
  };

  const maxVisibleItems = showAllEvidence
    ? undefined
    : MAX_VISIBLE_EVIDENCE_ITEMS;

  const handleCopyEvidence = async (value: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedEvidence(value);

    window.setTimeout(() => {
      setCopiedEvidence((currentValue) =>
        currentValue === value ? null : currentValue,
      );
    }, COPY_FEEDBACK_TIMEOUT_MS);
  };

  const totalEvidenceCount = evidence.length;

  const sectionConfigs = useMemo(
    () => getEvidenceSections(evidence, maxVisibleItems),
    [evidence, maxVisibleItems],
  );

  const brokenImagesCount = sectionConfigs[0].totalCount;
  const consoleErrorCount = sectionConfigs[1].totalCount;
  const failedRequestCount = sectionConfigs[2].totalCount;

  const showToggle = canToggleEvidence(sectionConfigs, activeFilter);

  const handleCopyAllEvidence = async () => {
    const visibleText = getVisibleEvidenceText(sectionConfigs, activeFilter);

    await navigator.clipboard.writeText(visibleText);
    setHasCopiedAllEvidence(true);

    window.setTimeout(() => {
      setHasCopiedAllEvidence(false);
    }, COPY_FEEDBACK_TIMEOUT_MS);
  };

  if (totalEvidenceCount === 0) {
    return (
      <EmptyState
        title="No issues found"
        description="This run didn't detect any broken images, console errors, or failed requests."
        icon={CheckCircle}
      />
    );
  }

  const filters: {
    id: EvidenceFilter;
    label: string;
    count: number;
  }[] = [
    { id: "all", label: "All", count: totalEvidenceCount },
    { id: "images", label: "Images", count: brokenImagesCount },
    { id: "console", label: "Console", count: consoleErrorCount },
    { id: "network", label: "Network", count: failedRequestCount },
  ];

  return (
    <div className="mt-5 border-t border-border pt-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <h3 className="text-sm font-medium text-foreground">Evidence</h3>

          <div className="flex flex-wrap items-center gap-2">
            {filters.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={activeFilter === f.id}
                onClick={() => handleFilterChange(f.id)}
                className={`rounded-full border px-2 py-1 text-xs transition ${
                  activeFilter === f.id
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-panel text-muted hover:text-foreground"
                }`}
              >
                {f.label} ({f.count})
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(filters.find((f) => f.id === activeFilter)?.count ?? 0) > 0 && (
            <button
              type="button"
              onClick={handleCopyAllEvidence}
              className="rounded-full border border-border px-2 py-1 text-xs text-muted transition hover:text-foreground"
            >
              {hasCopiedAllEvidence ? "Copied!" : "Copy visible"}
            </button>
          )}

          {showToggle ? (
            <button
              type="button"
              onClick={() => setShowAllEvidence((current) => !current)}
              className="rounded-full border border-border px-2 py-1 text-xs text-muted transition hover:text-foreground"
            >
              {showAllEvidence ? "Show less" : "Show all evidence"}
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-6">
        {sectionConfigs.map((section) => {
          if (activeFilter !== "all" && activeFilter !== section.id) {
            return null;
          }

          if (section.totalCount === 0 && activeFilter === section.id) {
            return (
              <EmptyState
                key={`empty-${section.id}`}
                title={section.emptyTitle}
                description={section.emptyDesc}
                icon={section.icon}
              />
            );
          }

          if (section.totalCount === 0) {
            return null;
          }

          const isHighlighted = section.id === scrollTarget;
          const highlightClass = isHighlighted
            ? "ring-2 ring-accent/40 bg-accent/5"
            : "ring-0 ring-transparent bg-transparent";

          return (
            <div
              key={section.id}
              id={`evidence-section-${section.id}`}
              className={`rounded-lg p-2 -m-2 transition-all duration-1000 ${highlightClass}`}
            >
              <EvidenceSection
                title={section.title}
                items={section.items}
                totalCount={section.totalCount}
                copiedEvidence={copiedEvidence}
                onCopyEvidence={handleCopyEvidence}
                onSelectEvidence={setSelectedEvidence}
              />
            </div>
          );
        })}
      </div>

      {selectedEvidence && (
        <EvidenceDetailModal
          evidence={selectedEvidence}
          onClose={() => setSelectedEvidence(null)}
          onStatusChange={(newStatus) => {
            onStatusChange?.(selectedEvidence.id, newStatus);
            setSelectedEvidence((prev) =>
              prev ? { ...prev, status: newStatus } : null,
            );
          }}
        />
      )}
    </div>
  );
}
