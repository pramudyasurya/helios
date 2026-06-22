"use client";
import { useState, useMemo } from "react";
import {
  COPY_FEEDBACK_TIMEOUT_MS,
  MAX_VISIBLE_EVIDENCE_ITEMS,
} from "@/lib/helios/shared/constants";
import type { RunEvidence } from "@/lib/helios/shared/types";

import { EvidenceSection } from "@/components/helios/evidence/evidence-section";
import { EmptyState } from "../ui/empty-state";
import { transformRawEvidence } from "@/lib/helios/shared/evidence-transformer";
import { EvidenceDetailModal } from "@/components/helios/evidence/evidence-detail-modal";

type RunEvidenceListProps = {
  runId: string;
  capturedAt: string;
  pageUrl: string;
  brokenImages?: string[];
  consoleErrors?: string[];
  failedRequests?: string[];
};

type FilterType = "all" | "images" | "console" | "network";

export function RunEvidenceList({
  runId,
  capturedAt,
  pageUrl,
  brokenImages,
  consoleErrors,
  failedRequests,
}: RunEvidenceListProps) {
  const [showAllEvidence, setShowAllEvidence] = useState(false);
  const [copiedEvidence, setCopiedEvidence] = useState<string | null>(null);
  const [hasCopiedAllEvidence, setHasCopiedAllEvidence] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [selectedEvidence, setSelectedEvidence] = useState<RunEvidence | null>(
    null,
  );

  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(filter);
    setShowAllEvidence(false);
    setHasCopiedAllEvidence(false);
  };

  const maxVisibleItems = showAllEvidence
    ? undefined
    : MAX_VISIBLE_EVIDENCE_ITEMS;

  const brokenImagesCount = brokenImages?.length ?? 0;
  const consoleErrorCount = consoleErrors?.length ?? 0;
  const failedRequestCount = failedRequests?.length ?? 0;

  const canToggleEvidence =
    ((activeFilter === "all" || activeFilter === "images") &&
      brokenImagesCount > MAX_VISIBLE_EVIDENCE_ITEMS) ||
    ((activeFilter === "all" || activeFilter === "console") &&
      consoleErrorCount > MAX_VISIBLE_EVIDENCE_ITEMS) ||
    ((activeFilter === "all" || activeFilter === "network") &&
      failedRequestCount > MAX_VISIBLE_EVIDENCE_ITEMS);

  const handleCopyEvidence = async (value: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedEvidence(value);

    window.setTimeout(() => {
      setCopiedEvidence((currentValue) =>
        currentValue === value ? null : currentValue,
      );
    }, COPY_FEEDBACK_TIMEOUT_MS);
  };

  const totalEvidenceCount =
    brokenImagesCount + consoleErrorCount + failedRequestCount;

  const sectionConfigs = useMemo(() => {
    const allEvidence = transformRawEvidence({
      runId,
      capturedAt,
      pageUrl,
      brokenImages,
      consoleErrors,
      failedRequests,
    });

    return [
      {
        id: "images" as const,
        title: "Broken images",
        items: allEvidence
          .filter((e) => e.type === "image")
          .slice(0, maxVisibleItems),
        totalCount: brokenImagesCount,
        emptyTitle: "No broken images",
        emptyDesc: "No broken images were detected in this run.",
      },
      {
        id: "console" as const,
        title: "Console errors",
        items: allEvidence
          .filter((e) => e.type === "console")
          .slice(0, maxVisibleItems),
        totalCount: consoleErrorCount,
        emptyTitle: "No console errors",
        emptyDesc: "No console errors were logged in this run.",
      },
      {
        id: "network" as const,
        title: "Failed network requests",
        items: allEvidence
          .filter((e) => e.type === "network")
          .slice(0, maxVisibleItems),
        totalCount: failedRequestCount,
        emptyTitle: "No failed requests",
        emptyDesc: "No network requests failed in this run.",
      },
    ];
  }, [
    runId,
    capturedAt,
    pageUrl,
    brokenImages,
    consoleErrors,
    failedRequests,
    maxVisibleItems,
    brokenImagesCount,
    consoleErrorCount,
    failedRequestCount,
  ]);

  const handleCopyAllEvidence = async () => {
    const visibleText = sectionConfigs
      .filter(
        (section) => activeFilter === "all" || activeFilter === section.id,
      )
      .filter((section) => section.items.length > 0)
      .map((section) =>
        [
          `${section.title} (${section.items.length})`,
          ...section.items.map((evidence) => `- ${evidence.content}`),
        ].join("\n"),
      )
      .join("\n\n");

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
      />
    );
  }

  const filters: {
    id: FilterType;
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

          {canToggleEvidence ? (
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
              />
            );
          }

          if (section.totalCount === 0) {
            return null;
          }

          return (
            <EvidenceSection
              key={section.id}
              title={section.title}
              items={section.items}
              totalCount={section.totalCount}
              copiedEvidence={copiedEvidence}
              onCopyEvidence={handleCopyEvidence}
              onSelectEvidence={setSelectedEvidence}
            />
          );
        })}
      </div>

      {selectedEvidence && (
        <EvidenceDetailModal
          evidence={selectedEvidence}
          onClose={() => setSelectedEvidence(null)}
        />
      )}
    </div>
  );
}
