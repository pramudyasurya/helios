"use client";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { COPY_FEEDBACK_TIMEOUT_MS } from "@/lib/helios/shared/constants";
import type { RunEvidence } from "@/lib/helios/shared/types";
import { formatTimestamp } from "@/lib/helios/shared/format";

type EvidenceDetailModalProps = {
  evidence: RunEvidence;
  onClose: () => void;
};

const evidenceTypeLabels: Record<RunEvidence["type"], string> = {
  image: "Broken image",
  console: "Console error",
  network: "Failed request",
};

export function EvidenceDetailModal({
  evidence,
  onClose,
}: EvidenceDetailModalProps) {
  const [hasCopiedContent, setHasCopiedContent] = useState(false);

  const handleCopyContent = async () => {
    await navigator.clipboard.writeText(evidence.content);
    setHasCopiedContent(true);

    window.setTimeout(() => {
      setHasCopiedContent(false);
    }, COPY_FEEDBACK_TIMEOUT_MS);
  };

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Evidence details"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4 backdrop-blur-sm md:p-8"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="relative w-full max-w-3xl rounded-lg border border-border bg-panel p-5"
      >
        <button
          type="button"
          autoFocus
          aria-label="Close evidence details"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-sm p-1 text-muted transition hover:text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pr-12">
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-border px-2 py-1 text-xs text-muted">
              {evidenceTypeLabels[evidence.type]}
            </span>
            <span className="text-xs text-muted">
              {formatTimestamp(evidence.capturedAt)}
            </span>
          </div>

          <button
            type="button"
            onClick={handleCopyContent}
            className="rounded-full border border-border px-2 py-1 text-xs text-muted transition hover:text-foreground"
          >
            {hasCopiedContent ? "Copied!" : "Copy content"}
          </button>
        </div>

        <div className="mt-4">
          <p className="text-xs text-muted">Observed on</p>
          <a
            href={evidence.pageUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-1 block break-all text-xs text-accent hover:underline"
          >
            {evidence.pageUrl}
          </a>
        </div>

        {evidence.resourceUrl && evidence.resourceUrl !== evidence.pageUrl && (
          <div className="mt-4">
            <p className="text-xs text-muted">Related resource</p>
            <a
              href={evidence.resourceUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block break-all text-xs text-accent hover:underline"
            >
              {evidence.resourceUrl}
            </a>
          </div>
        )}

        <pre className="mt-4 max-h-[50vh] overflow-auto whitespace-pre-wrap wrap-break-word rounded-md border border-border bg-card p-4 text-xs text-foreground">
          {evidence.content}
        </pre>
      </div>
    </div>
  );
}
