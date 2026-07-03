"use client";

import {
  STATUS_STYLES,
  INACTIVE_STYLE,
} from "@/lib/helios/shared/evidence-sections";
import { HELIOS_ROUTES } from "@/lib/helios/shared/routes";
import {
  EVIDENCE_STATUSES,
  type EvidenceStatus,
  type EvidenceType,
} from "@/lib/helios/shared/types";
import { Activity, FileWarning, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import { useState, useOptimistic, startTransition } from "react";
import { EvidenceDetailModal } from "./evidence-detail-modal";
import { formatTimestamp } from "@/lib/helios/shared/format";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { updateEvidenceStatus } from "@/lib/helios/client/api";

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

interface GlobalEvidenceBoardProps {
  items: BoardEvidenceItem[];
  activeStatus: string;
  activeType: string;
  counts: {
    open: number;
    resolved: number;
    ignored: number;
  };
}

function formatPagePath(urlStr: string) {
  try {
    const url = new URL(urlStr);
    return url.pathname + url.search;
  } catch {
    return urlStr;
  }
}

export function GlobalEvidenceBoard({
  items,
  activeStatus,
  activeType,
  counts,
}: GlobalEvidenceBoardProps) {
  const [selectedEvidence, setSelectedEvidence] =
    useState<BoardEvidenceItem | null>(null);

  const [optimisticItems, setOptimisticStatus] = useOptimistic(
    items,
    (state, update: { id: string; status: EvidenceStatus }) =>
      state.map((item) =>
        item.id === update.id ? { ...item, status: update.status } : item,
      ),
  );

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleStatusChange = async (
    item: BoardEvidenceItem,
    newStatus: EvidenceStatus,
  ) => {
    if (item.status === newStatus) return;

    startTransition(async () => {
      setOptimisticStatus({ id: item.id, status: newStatus });

      if (selectedEvidence && selectedEvidence.id === item.id) {
        setSelectedEvidence({ ...selectedEvidence, status: newStatus });
      }

      try {
        await updateEvidenceStatus(item.runId, item.id, newStatus);
        router.refresh();
      } catch (error) {
        console.error("Failed to update status:", error);

        if (selectedEvidence && selectedEvidence.id === item.id) {
          setSelectedEvidence({ ...selectedEvidence, status: item.status });
        }
      }
    });
  };

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value === "all" && key === "type") {
      params.delete(key);
    } else if (value === "open" && key === "status") {
      params.delete(key);
    } else {
      params.set(key, value);
    }

    router.push(`${pathname}?${params.toString()}`);
  };

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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-panel p-4">
          <p className="text-xs font-medium text-muted">Open Issues</p>
          <p className="mt-1 text-2xl font-semibold text-amber-500">
            {counts.open}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-panel p-4">
          <p className="text-xs font-medium text-muted">Resolved Issues</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-500">
            {counts.resolved}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-panel p-4">
          <p className="text-xs font-medium text-muted">Ignored Issues</p>
          <p className="mt-1 text-2xl font-semibold text-muted">
            {counts.ignored}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-panel p-4">
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
          <label
            htmlFor="status-filter"
            className="text-xs font-medium text-muted"
          >
            Status:
          </label>
          <select
            id="status-filter"
            value={activeStatus}
            onChange={(e) => handleFilterChange("status", e.target.value)}
            className="rounded-md border border-border bg-card px-3 py-1.5 text-xs text-foreground focus:border-accent focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
            <option value="ignored">Ignored</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
          <label
            htmlFor="type-filter"
            className="text-xs font-medium text-muted"
          >
            Type:
          </label>
          <select
            id="type-filter"
            value={activeType}
            onChange={(e) => handleFilterChange("type", e.target.value)}
            className="rounded-md border border-border bg-card px-3 py-1.5 text-xs text-foreground focus:border-accent focus:outline-none"
          >
            <option value="all">All Types</option>
            <option value="image">Broken Images</option>
            <option value="console">Console Errors</option>
            <option value="network">Failed Requests</option>
          </select>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-panel overflow-hidden">
        <ul className="divide-y divide-border">
          {optimisticItems.map((item) => {
            return (
              <li
                key={item.id}
                className="flex flex-col gap-4 p-4 transition hover:bg-card/40 md:flex-row md:items-center md:justify-between"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0 mt-0.5">
                    <span
                      className="text-muted mr-1"
                      title={`Type: ${item.type}`}
                    >
                      {getIcon(item.type)}
                    </span>

                    {EVIDENCE_STATUSES.map((statusOption) => {
                      const isActive = item.status === statusOption;
                      const buttonStyle = isActive
                        ? STATUS_STYLES[statusOption]
                        : INACTIVE_STYLE;

                      return (
                        <button
                          key={statusOption}
                          type="button"
                          onClick={() => handleStatusChange(item, statusOption)}
                          className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider transition-all ${buttonStyle}`}
                        >
                          {statusOption}
                        </button>
                      );
                    })}
                  </div>

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

        {optimisticItems.length === 0 && (
          <div role="status" className="py-12 text-center text-sm text-muted">
            No evidence records found.
          </div>
        )}
      </div>

      {selectedEvidence && (
        <EvidenceDetailModal
          evidence={selectedEvidence}
          onClose={() => setSelectedEvidence(null)}
          onStatusChange={(status) =>
            handleStatusChange(selectedEvidence, status)
          }
        />
      )}
    </div>
  );
}
