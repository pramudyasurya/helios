"use client";

import { STATUS_STYLES } from "@/lib/helios/shared/evidence-sections";
import { HELIOS_ROUTES } from "@/lib/helios/shared/routes";
import type { EvidenceStatus, EvidenceType } from "@/lib/helios/shared/types";
import { Activity, FileWarning, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { EvidenceDetailModal } from "./evidence-detail-modal";
import { formatTimestamp } from "@/lib/helios/shared/format";

export interface BoardEvidenceItem {
  id: string;
  type: EvidenceType;
  status: EvidenceStatus;
  content: string;
  pageUrl: string;
  resourceUrl?: string;
  capturedAt: string;

  runId: string;
  runTitle: string;
  runUrl: string;
}

function formatPagePath(urlStr: string) {
  try {
    const url = new URL(urlStr);
    return url.pathname + url.search;
  } catch {
    return urlStr;
  }
}

export function GlobalEvidenceBoard({ items }: { items: BoardEvidenceItem[] }) {
  const [selectedEvidence, setSelectedEvidence] =
    useState<BoardEvidenceItem | null>(null);

  const getIcon = (type: EvidenceType) => {
    switch (type) {
      case "image":
        return <ImageIcon className="h-3 w-3" />;
      case "console":
        return <FileWarning className="h-3 w-3" />;
      case "network":
        return <Activity className="h-3 w-3" />;
      default:
        return <FileWarning className="h-3 w-3" />;
    }
  };

  const openCount = items.filter((i) => i.status === "open").length;
  const resolvedCount = items.filter((i) => i.status === "resolved").length;
  const ignoredCount = items.filter((i) => i.status === "ignored").length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-panel p-4">
          <p className="text-xs font-medium text-muted">Open Issues</p>
          <p className="mt-1 text-2xl font-semibold text-amber-500">
            {openCount}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-panel p-4">
          <p className="text-xs font-medium text-muted">Resolved Issues</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-500">
            {resolvedCount}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-panel p-4">
          <p className="text-xs font-medium text-muted">Ignored Issues</p>
          <p className="mt-1 text-2xl font-semibold text-muted">
            {ignoredCount}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-panel overflow-hidden">
        <ul className="divide-y divide-border">
          {items.map((item) => {
            const style = STATUS_STYLES[item.status] || STATUS_STYLES.open;

            return (
              <li
                key={item.id}
                className="flex flex-col gap-4 p-4 transition hover:bg-card/40 md:flex-row md:items-center md:justify-between"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span
                    className={`mt-0.5 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider shrink-0 ${style}`}
                  >
                    {getIcon(item.type)}
                    {item.status}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p
                      className="text-sm font-medium text-foreground truncate"
                      title={item.content}
                    >
                      {item.content}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Observed on:{" "}
                      <span className="text-foreground">
                        {formatPagePath(item.pageUrl)}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-t border-border/40 pt-3 md:border-t-0 md:pt-0 md:justify-end md:gap-6">
                  <div className="flex flex-col text-xs md:items-end">
                    <span className="text-muted">
                      Run:{" "}
                      <Link
                        href={HELIOS_ROUTES.runDetail(item.runId)}
                        className="font-medium text-accent hover:underline inline-block align-bottom truncate max-w-[200px]"
                        title={item.runTitle}
                      >
                        {item.runTitle}
                      </Link>
                    </span>
                    <span className="text-[10px] text-muted mt-0.5">
                      {formatTimestamp(item.capturedAt)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedEvidence(item)}
                    className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted"
                  >
                    View details
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        {items.length === 0 && (
          <div className="py-12 text-center text-sm text-muted">
            No evidence records found.
          </div>
        )}
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
