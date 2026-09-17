"use client";

import { Download, ExternalLink, Activity, Info, Layers, Film, Network } from "lucide-react";
import type { LatestRun } from "@/lib/shared/domain/types";
import { EmptyState } from "@/components/ui/empty-state";

export interface TraceViewerTabProps {
  run: LatestRun;
}

export function TraceViewerTab({ run }: TraceViewerTabProps) {
  const traceUrl = run.artifacts?.trace;

  if (!traceUrl) {
    return (
      <EmptyState
        title="No trace recorded"
        description="Playwright trace recording was not captured or is not available for this run."
        icon={Activity}
      />
    );
  }

  const encodedTraceUrl = encodeURIComponent(traceUrl);
  const traceViewerUrl = `https://trace.playwright.dev/?trace=${encodedTraceUrl}`;

  return (
    <div className="space-y-6 w-full">
      {/* Header action bar */}
      <div className="rounded-xs border border-border bg-card p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/10 text-accent">
              <Activity className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <h3 className="text-sm font-semibold text-foreground">Playwright Trace Inspection</h3>
          </div>
          <p className="text-xs text-muted max-w-xl">
            Inspect action filmstrips, DOM snapshots, network requests, and console events recorded during execution.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <a
            href={traceUrl}
            download={`trace-${run.id}.zip`}
            className="inline-flex items-center gap-1.5 rounded-xs border border-border bg-muted/20 hover:bg-muted/40 px-3 py-1.5 text-xs font-medium text-foreground transition-colors cursor-pointer"
            title="Download trace.zip archive"
          >
            <Download className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
            <span>Download trace.zip</span>
          </a>

          <a
            href={traceViewerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xs border border-accent/40 bg-accent/10 hover:bg-accent/20 px-3 py-1.5 text-xs font-medium text-accent transition-colors cursor-pointer"
            title="Open in official Playwright Trace Viewer"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Open in Trace Viewer</span>
          </a>
        </div>
      </div>

      {/* Embedded viewer / instructions */}
      <div className="rounded-xs border border-border bg-card overflow-hidden">
        <div className="border-b border-border/80 bg-muted/10 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium text-foreground">
            <Film className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
            <span>Interactive Timeline & Snapshot Viewer</span>
          </div>
          <span className="text-[11px] font-mono text-muted">trace.playwright.dev</span>
        </div>

        <div className="relative w-full aspect-video min-h-[500px] bg-background">
          <iframe
            src={traceViewerUrl}
            title="Playwright Trace Viewer"
            className="absolute inset-0 w-full h-full border-0"
            allow="clipboard-read; clipboard-write"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-downloads"
          />
        </div>

        {/* Feature guidance badges */}
        <div className="p-4 border-t border-border/80 bg-muted/5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="flex items-start gap-2 text-muted">
            <Film className="h-4 w-4 shrink-0 text-accent mt-0.5" aria-hidden="true" />
            <div>
              <span className="font-medium text-foreground block">Action Filmstrip</span>
              <span>Scrub along timeline to see visual page state changes per step.</span>
            </div>
          </div>
          <div className="flex items-start gap-2 text-muted">
            <Layers className="h-4 w-4 shrink-0 text-accent mt-0.5" aria-hidden="true" />
            <div>
              <span className="font-medium text-foreground block">DOM Snapshots</span>
              <span>Inspect full DOM tree before and after each locator action.</span>
            </div>
          </div>
          <div className="flex items-start gap-2 text-muted">
            <Network className="h-4 w-4 shrink-0 text-accent mt-0.5" aria-hidden="true" />
            <div>
              <span className="font-medium text-foreground block">Network & Logs</span>
              <span>Correlate network waterfall and console logs to timeline steps.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
