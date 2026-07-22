"use client";

import { useState } from "react";
import type { PageResult } from "@/lib/shared/domain/types";
import { StatusBadge } from "@/app/runs/[id]/_components/status-badge";

type PageResultsTabProps = {
  pageResults?: PageResult[];
};

export function PageResultsTab({ pageResults = [] }: PageResultsTabProps) {
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);

  if (pageResults.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <p className="text-sm text-muted">
          No multi-page crawl results recorded for this run.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Crawled Pages ({pageResults.length})
        </h3>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {pageResults.map((page, index) => {
          const consoleCount = page.consoleErrors?.length ?? 0;
          const brokenImageCount = page.brokenImages?.length ?? 0;
          const failedRequestCount = page.failedRequests?.length ?? 0;
          const isSuccessful = page.statusCode && page.statusCode >= 200 && page.statusCode < 400;

          return (
            <div
              key={page.id || index}
              className="rounded-lg border border-border bg-card p-4 transition hover:border-accent/40"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="rounded bg-accent/10 text-accent px-2 py-0.5 text-[11px] font-mono font-medium">
                    Depth {page.depth}
                  </span>
                  <a
                    href={page.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-sm font-medium text-foreground hover:underline"
                  >
                    {page.url}
                  </a>
                </div>

                <div className="flex items-center gap-2">
                  {page.statusCode && (
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-mono font-medium ${
                        isSuccessful
                          ? "bg-success/10 text-success"
                          : "bg-danger/10 text-danger"
                      }`}
                    >
                      {page.statusCode}
                    </span>
                  )}
                  <StatusBadge status={page.status === "completed" ? "Completed" : "Failed"} />
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Details Column */}
                <div className="md:col-span-2 space-y-2 text-xs">
                  {page.title && (
                    <div>
                      <span className="text-muted">Title: </span>
                      <span className="font-medium text-foreground">{page.title}</span>
                    </div>
                  )}
                  {page.loadMetrics && (
                    <div className="flex gap-4 text-muted font-mono">
                      <span>DOM: {page.loadMetrics.domContentLoadedMs}ms</span>
                      <span>Load: {page.loadMetrics.loadEventMs}ms</span>
                      {page.durationMs && <span>Total: {page.durationMs}ms</span>}
                    </div>
                  )}

                  {/* Issue Pills */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span
                      className={`rounded px-2 py-1 text-xs font-medium ${
                        consoleCount > 0
                          ? "bg-danger/10 text-danger"
                          : "bg-muted/10 text-muted"
                      }`}
                    >
                      Console errors: {consoleCount}
                    </span>
                    <span
                      className={`rounded px-2 py-1 text-xs font-medium ${
                        brokenImageCount > 0
                          ? "bg-warning/10 text-warning"
                          : "bg-muted/10 text-muted"
                      }`}
                    >
                      Broken images: {brokenImageCount}
                    </span>
                    <span
                      className={`rounded px-2 py-1 text-xs font-medium ${
                        failedRequestCount > 0
                          ? "bg-danger/10 text-danger"
                          : "bg-muted/10 text-muted"
                      }`}
                    >
                      Failed requests: {failedRequestCount}
                    </span>
                  </div>
                </div>

                {/* Screenshot Thumbnail */}
                {page.artifacts?.desktopScreenshot && (
                  <div className="flex flex-col items-end">
                    <button
                      type="button"
                      onClick={() => setSelectedScreenshot(page.artifacts!.desktopScreenshot)}
                      className="group relative overflow-hidden rounded border border-border bg-background transition hover:border-accent"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={page.artifacts.desktopScreenshot}
                        alt={`Screenshot of ${page.url}`}
                        className="h-24 w-36 object-cover object-top transition group-hover:scale-105"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition">
                        <span className="text-[11px] font-medium text-white">Expand</span>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Screenshot Lightbox Modal */}
      {selectedScreenshot && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setSelectedScreenshot(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-auto rounded-lg bg-card p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedScreenshot}
              alt="Page screenshot preview"
              className="w-full h-auto rounded"
            />
            <button
              type="button"
              onClick={() => setSelectedScreenshot(null)}
              className="absolute top-4 right-4 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white hover:bg-black"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
