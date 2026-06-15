"use client";
import { useState } from "react";
import {
  COPY_FEEDBACK_TIMEOUT_MS,
  MAX_VISIBLE_EVIDENCE_ITEMS,
} from "@/lib/helios/shared/constants";

import { EvidenceSection } from "@/components/helios/evidence-section";

type RunEvidenceListProps = {
  brokenImages?: string[];
  consoleErrors?: string[];
  failedRequests?: string[];
};

function formatEvidenceGroup(title: string, items: string[] = []) {
  if (items.length === 0) return "";

  return [
    `${title} (${items.length})`,
    ...items.map((item) => `- ${item}`),
  ].join("\n");
}

function formatEvidenceForClipboard({
  brokenImages,
  consoleErrors,
  failedRequests,
}: RunEvidenceListProps) {
  return [
    formatEvidenceGroup("Broken images", brokenImages),
    formatEvidenceGroup("Console errors", consoleErrors),
    formatEvidenceGroup("Failed network requests", failedRequests),
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function RunEvidenceList({
  brokenImages,
  consoleErrors,
  failedRequests,
}: RunEvidenceListProps) {
  const [showAllEvidence, setShowAllEvidence] = useState(false);
  const [copiedEvidence, setCopiedEvidence] = useState<string | null>(null);
  const [hasCopiedAllEvidence, setHasCopiedAllEvidence] = useState(false);

  const maxVisibleItems = showAllEvidence
    ? undefined
    : MAX_VISIBLE_EVIDENCE_ITEMS;

  const visibleBrokenImages = brokenImages?.slice(0, maxVisibleItems) ?? [];
  const visibleConsoleErrors = consoleErrors?.slice(0, maxVisibleItems) ?? [];
  const visibleFailedRequests = failedRequests?.slice(0, maxVisibleItems) ?? [];

  const brokenImagesCount = brokenImages?.length ?? 0;
  const consoleErrorCount = consoleErrors?.length ?? 0;
  const failedRequestCount = failedRequests?.length ?? 0;

  const canToggleEvidence =
    brokenImagesCount > MAX_VISIBLE_EVIDENCE_ITEMS ||
    consoleErrorCount > MAX_VISIBLE_EVIDENCE_ITEMS ||
    failedRequestCount > MAX_VISIBLE_EVIDENCE_ITEMS;

  const handleCopyEvidence = async (value: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedEvidence(value);

    window.setTimeout(() => {
      setCopiedEvidence((currentValue) =>
        currentValue === value ? null : currentValue,
      );
    }, COPY_FEEDBACK_TIMEOUT_MS);
  };

  const handleCopyAllEvidence = async () => {
    const evidenceText = formatEvidenceForClipboard({
      brokenImages,
      consoleErrors,
      failedRequests,
    });

    await navigator.clipboard.writeText(evidenceText);
    setHasCopiedAllEvidence(true);

    window.setTimeout(() => {
      setHasCopiedAllEvidence(false);
    }, COPY_FEEDBACK_TIMEOUT_MS);
  };

  if (
    visibleConsoleErrors.length === 0 &&
    visibleFailedRequests.length === 0 &&
    visibleBrokenImages.length === 0
  ) {
    return null;
  }

  return (
    <div className="mt-5 border-t border-border pt-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-foreground">Evidence</h3>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyAllEvidence}
            className="rounded-full border border-border px-2 py-1 text-xs text-muted transition hover:text-foreground"
          >
            {hasCopiedAllEvidence ? "Copied all" : "Copy all"}
          </button>

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

      <EvidenceSection
        title="Broken images"
        items={visibleBrokenImages}
        totalCount={brokenImagesCount}
        copiedEvidence={copiedEvidence}
        onCopyEvidence={handleCopyEvidence}
        itemKeyPrefix="image"
      />

      <EvidenceSection
        title="Console errors"
        items={visibleConsoleErrors}
        totalCount={consoleErrorCount}
        copiedEvidence={copiedEvidence}
        onCopyEvidence={handleCopyEvidence}
        itemKeyPrefix="console"
      />

      <EvidenceSection
        title="Failed network requests"
        items={visibleFailedRequests}
        totalCount={failedRequestCount}
        copiedEvidence={copiedEvidence}
        onCopyEvidence={handleCopyEvidence}
        itemKeyPrefix="request"
      />
    </div>
  );
}
