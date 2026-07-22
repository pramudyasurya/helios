"use client";

import { useState, useEffect } from "react";

export type RunMode = "single" | "manual" | "crawl";

export type RunConfig = {
  mode: RunMode;
  routes?: string[];
  maxPages?: number;
  maxDepth?: number;
};

type RunOptionsPickerProps = {
  onChange: (config: RunConfig) => void;
  isDisabled?: boolean;
};

export function RunOptionsPicker({
  onChange,
  isDisabled = false,
}: RunOptionsPickerProps) {
  const [mode, setMode] = useState<RunMode>("single");
  const [routesText, setRoutesText] = useState("");
  const [maxPages, setMaxPages] = useState(5);
  const [maxDepth, setMaxDepth] = useState(2);

  useEffect(() => {
    let routes: string[] | undefined;
    if (mode === "manual") {
      routes = routesText
        .split("\n")
        .map((r) => r.trim())
        .filter(Boolean);
    }

    onChange({
      mode,
      routes: mode === "manual" ? routes : undefined,
      maxPages: mode === "crawl" ? maxPages : undefined,
      maxDepth: mode === "crawl" ? maxDepth : undefined,
    });
  }, [mode, routesText, maxPages, maxDepth, onChange]);

  return (
    <div className="mt-4 rounded-md border border-border bg-card/50 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">
          Execution Mode
        </span>
      </div>

      {/* Mode Segmented Pills */}
      <div className="mt-2 grid grid-cols-3 gap-2 rounded-lg bg-background p-1 border border-border">
        <button
          type="button"
          disabled={isDisabled}
          onClick={() => setMode("single")}
          className={`rounded-md py-1.5 text-xs font-medium transition ${
            mode === "single"
              ? "bg-accent text-background font-semibold shadow-sm"
              : "text-muted hover:text-foreground hover:bg-card/50"
          }`}
        >
          Single Page
        </button>
        <button
          type="button"
          disabled={isDisabled}
          onClick={() => setMode("manual")}
          className={`rounded-md py-1.5 text-xs font-medium transition ${
            mode === "manual"
              ? "bg-accent text-background font-semibold shadow-sm"
              : "text-muted hover:text-foreground hover:bg-card/50"
          }`}
        >
          Manual Routes
        </button>
        <button
          type="button"
          disabled={isDisabled}
          onClick={() => setMode("crawl")}
          className={`rounded-md py-1.5 text-xs font-medium transition ${
            mode === "crawl"
              ? "bg-accent text-background font-semibold shadow-sm"
              : "text-muted hover:text-foreground hover:bg-card/50"
          }`}
        >
          Auto Crawl
        </button>
      </div>

      {/* Mode Configurations */}
      {mode === "single" && (
        <p className="mt-3 text-xs text-muted">
          Evaluates the specified URL only. Fastest check for landing pages.
        </p>
      )}

      {mode === "manual" && (
        <div className="mt-3">
          <label htmlFor="manual-routes" className="block text-xs font-medium text-foreground">
            Custom Relative Routes (one per line)
          </label>
          <textarea
            id="manual-routes"
            disabled={isDisabled}
            value={routesText}
            onChange={(e) => setRoutesText(e.target.value)}
            rows={3}
            placeholder={"/\n/about\n/docs/getting-started"}
            className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted outline-none focus:ring-1 focus:ring-accent disabled:opacity-60"
          />
          <p className="mt-1 text-[11px] text-muted">
            Enter relative paths to evaluate sequentially during the run.
          </p>
        </div>
      )}

      {mode === "crawl" && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="max-pages" className="block text-xs font-medium text-foreground">
              Max Pages ({maxPages})
            </label>
            <input
              type="number"
              id="max-pages"
              min={1}
              max={20}
              disabled={isDisabled}
              value={maxPages}
              onChange={(e) => setMaxPages(Math.min(20, Math.max(1, Number(e.target.value) || 1)))}
              className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-accent disabled:opacity-60"
            />
            <p className="mt-1 text-[11px] text-muted">Limit internal links to evaluate (1–20).</p>
          </div>
          <div>
            <label htmlFor="max-depth" className="block text-xs font-medium text-foreground">
              Max Depth ({maxDepth})
            </label>
            <input
              type="number"
              id="max-depth"
              min={1}
              max={5}
              disabled={isDisabled}
              value={maxDepth}
              onChange={(e) => setMaxDepth(Math.min(5, Math.max(1, Number(e.target.value) || 1)))}
              className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-accent disabled:opacity-60"
            />
            <p className="mt-1 text-[11px] text-muted">Max link hop distance from root (1–5).</p>
          </div>
        </div>
      )}
    </div>
  );
}
