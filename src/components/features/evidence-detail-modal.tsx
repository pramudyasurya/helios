"use client";
import { useRef, useState } from "react";
import { X } from "lucide-react";
import { COPY_FEEDBACK_TIMEOUT_MS } from "@/lib/shared/domain/constants";
import { useModalFocus } from "@/lib/client/use-modal-focus";
import {
  EVIDENCE_STATUSES,
  type EvidenceStatus,
  type RunEvidence,
} from "@/lib/shared/domain/types";
import { formatTimestamp } from "@/lib/shared/domain/format";
import {
  STATUS_STYLES,
  INACTIVE_STYLE,
} from "@/lib/shared/domain/evidence-sections";

type EvidenceDetailModalProps = {
  evidence: RunEvidence & { screenshotUrl?: string };
  onClose: () => void;
  onStatusChange?: (status: EvidenceStatus) => void;
};

const evidenceTypeLabels: Record<RunEvidence["type"], string> = {
  image: "Broken image",
  console: "Console error",
  network: "Failed request",
};

export function EvidenceDetailModal({
  evidence,
  onClose,
  onStatusChange,
}: EvidenceDetailModalProps) {
  const [hasCopiedContent, setHasCopiedContent] = useState(false);
  const [showFullScreenshot, setShowFullScreenshot] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useModalFocus(modalRef, true, onClose);

  const handleCopyContent = async () => {
    await navigator.clipboard.writeText(evidence.content);
    setHasCopiedContent(true);

    window.setTimeout(() => {
      setHasCopiedContent(false);
    }, COPY_FEEDBACK_TIMEOUT_MS);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Evidence details"
      ref={modalRef}
      tabIndex={-1}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4 backdrop-blur-sm md:p-8"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="relative w-full max-w-3xl rounded-xs border border-border bg-panel p-5 shadow-lg"
      >
        <button
          type="button"
          aria-label="Close evidence details"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xs p-1 text-muted transition hover:text-foreground focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pr-12">
          <div className="flex items-center gap-3">
            <span className="rounded-xs border border-border px-2 py-1 text-xs text-muted">
              {evidenceTypeLabels[evidence.type]}
            </span>
            {evidence.viewport && (
              <span className="rounded-xs border border-border px-2 py-1 text-xs text-muted">
                {evidence.viewport}
              </span>
            )}
            {evidence.severity && (
              <span className="rounded-xs border border-border px-2 py-1 text-xs text-muted capitalize">
                {evidence.severity}
              </span>
            )}
            <span className="text-xs text-muted">
              {formatTimestamp(evidence.capturedAt)}
            </span>
          </div>

          <button
            type="button"
            onClick={handleCopyContent}
            className="rounded-xs border border-border px-2 py-1 text-xs text-muted transition hover:text-foreground cursor-pointer"
          >
            {hasCopiedContent ? "Copied!" : "Copy content"}
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <span className="text-xs font-medium text-muted">Status:</span>
          <div className="flex items-center gap-1.5">
            {EVIDENCE_STATUSES.map((statusOption) => {
              const isActive = evidence.status === statusOption;
              const buttonStyle = isActive
                ? STATUS_STYLES[statusOption]
                : INACTIVE_STYLE;

              return (
                <button
                  key={statusOption}
                  type="button"
                  onClick={() => onStatusChange?.(statusOption)}
                  className={`rounded-xs border px-2.5 py-0.5 text-xs font-medium capitalize transition-all cursor-pointer ${buttonStyle}`}
                >
                  {statusOption}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs text-muted">Observed on</p>
          <a
            href={evidence.pageUrl.startsWith("http://") || evidence.pageUrl.startsWith("https://") ? evidence.pageUrl : undefined}
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

        {evidence.screenshotUrl && (
          <div className="mt-4">
            <p className="text-xs text-muted">Screenshot</p>
            <button
              type="button"
              onClick={() => setShowFullScreenshot(true)}
              className="mt-1 block w-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent rounded-xs"
              aria-label="View full screenshot"
            >
              <img
                src={evidence.screenshotUrl}
                alt="Evidence screenshot"
                className="w-full rounded-xs border border-border object-top"
              />
            </button>
          </div>
        )}

        <pre className="mt-4 max-h-[50vh] overflow-auto whitespace-pre-wrap wrap-break-word rounded-xs border border-border bg-card p-4 text-xs text-foreground font-mono">
          {evidence.content}
        </pre>

        {showFullScreenshot && evidence.screenshotUrl && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Full screenshot"
            tabIndex={-1}
            onClick={() => setShowFullScreenshot(false)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.stopPropagation();
                setShowFullScreenshot(false);
              }
            }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-background/95 p-4 backdrop-blur-sm"
          >
            <button
              type="button"
              onClick={() => setShowFullScreenshot(false)}
              aria-label="Close full screenshot"
              className="absolute top-4 right-4 rounded-full border border-border p-2 text-muted transition hover:text-foreground hover:bg-card"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img
              src={evidence.screenshotUrl}
              alt="Evidence screenshot"
              className="max-h-[90vh] max-w-full rounded-xs border border-border object-top shadow-lg"
            />
          </div>
        )}
      </div>
    </div>
  );
}
