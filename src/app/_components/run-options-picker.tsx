"use client";

import { useState, useEffect } from "react";
import { Globe, ListChecks, Network, Plus, Minus } from "lucide-react";

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

  const modeCards = [
    {
      id: "single" as RunMode,
      title: "Single Page",
      description: "Fast 1-page check with screenshots & logs",
      icon: Globe,
    },
    {
      id: "crawl" as RunMode,
      title: "Auto Crawl",
      description: "Discovers & audits internal link hops",
      icon: Network,
    },
    {
      id: "manual" as RunMode,
      title: "Manual Routes",
      description: "Explicit route paths (/pricing, /login)",
      icon: ListChecks,
    },
  ];

  return (
    <div className="mt-4 rounded-xl border border-border/70 bg-card/40 p-4">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">
          Select QA Execution Mode
        </span>
      </div>

      {/* Visual Mode Selector Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {modeCards.map((card) => {
          const Icon = card.icon;
          const isSelected = mode === card.id;

          return (
            <button
              key={card.id}
              type="button"
              disabled={isDisabled}
              onClick={() => setMode(card.id)}
              className={`flex flex-col text-left rounded-lg p-3 border transition ${
                isSelected
                  ? "border-accent bg-accent/10 shadow-xs"
                  : "border-border/60 bg-background/80 hover:border-border hover:bg-card"
              } disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              <div className="flex items-center justify-between">
                <Icon
                  className={`h-4 w-4 ${
                    isSelected ? "text-accent" : "text-muted"
                  }`}
                />
                <span
                  className={`h-2 w-2 rounded-full ${
                    isSelected ? "bg-accent" : "bg-border"
                  }`}
                />
              </div>
              <span
                className={`mt-2 text-xs font-semibold ${
                  isSelected ? "text-foreground" : "text-muted"
                }`}
              >
                {card.title}
              </span>
              <span className="mt-0.5 text-[10px] text-muted leading-tight">
                {card.description}
              </span>
            </button>
          );
        })}
      </div>

      {/* Mode Configurations */}
      {mode === "single" && (
        <p className="mt-3 text-xs text-muted">
          Evaluates the specified URL only. Standard single-page Playwright check.
        </p>
      )}

      {mode === "manual" && (
        <div className="mt-3">
          <label
            htmlFor="manual-routes"
            className="block text-xs font-semibold text-foreground"
          >
            Custom Relative Routes (one per line)
          </label>
          <textarea
            id="manual-routes"
            disabled={isDisabled}
            value={routesText}
            onChange={(e) => setRoutesText(e.target.value)}
            rows={3}
            placeholder={"/\n/about\n/docs/getting-started"}
            className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted outline-none focus:ring-1 focus:ring-accent disabled:opacity-60"
          />
          <p className="mt-1 text-[11px] text-muted">
            Enter relative paths to evaluate sequentially during the run.
          </p>
        </div>
      )}

      {mode === "crawl" && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Borderless Editable Max Pages Stepper Input */}
          <div>
            <label
              htmlFor="max-pages"
              className="block text-xs font-semibold text-foreground"
            >
              Max Pages (1–20)
            </label>
            <div className="mt-1.5 flex items-center rounded-lg bg-background/80 p-1">
              <button
                type="button"
                disabled={isDisabled || maxPages <= 1}
                onClick={() => setMaxPages((prev) => Math.max(1, prev - 1))}
                className="flex h-7 w-7 items-center justify-center rounded-md bg-card/80 text-muted transition hover:bg-card hover:text-foreground active:scale-95 disabled:opacity-40"
                aria-label="Decrease max pages"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>

              <input
                type="number"
                id="max-pages"
                min={1}
                max={20}
                disabled={isDisabled}
                value={maxPages}
                onChange={(e) =>
                  setMaxPages(
                    Math.min(20, Math.max(1, Number(e.target.value) || 1)),
                  )
                }
                className="w-full bg-transparent text-center font-mono text-xs font-semibold text-foreground outline-none border-none ring-0 focus:outline-none focus:ring-0 focus:border-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />

              <button
                type="button"
                disabled={isDisabled || maxPages >= 20}
                onClick={() => setMaxPages((prev) => Math.min(20, prev + 1))}
                className="flex h-7 w-7 items-center justify-center rounded-md bg-card/80 text-muted transition hover:bg-card hover:text-foreground active:scale-95 disabled:opacity-40"
                aria-label="Increase max pages"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="mt-1 text-[11px] text-muted">
              Limit internal links to evaluate (type or click + / -).
            </p>
          </div>

          {/* Borderless Editable Max Depth Stepper Input */}
          <div>
            <label
              htmlFor="max-depth"
              className="block text-xs font-semibold text-foreground"
            >
              Max Depth (1–5)
            </label>
            <div className="mt-1.5 flex items-center rounded-lg bg-background/80 p-1">
              <button
                type="button"
                disabled={isDisabled || maxDepth <= 1}
                onClick={() => setMaxDepth((prev) => Math.max(1, prev - 1))}
                className="flex h-7 w-7 items-center justify-center rounded-md bg-card/80 text-muted transition hover:bg-card hover:text-foreground active:scale-95 disabled:opacity-40"
                aria-label="Decrease max depth"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>

              <input
                type="number"
                id="max-depth"
                min={1}
                max={5}
                disabled={isDisabled}
                value={maxDepth}
                onChange={(e) =>
                  setMaxDepth(
                    Math.min(5, Math.max(1, Number(e.target.value) || 1)),
                  )
                }
                className="w-full bg-transparent text-center font-mono text-xs font-semibold text-foreground outline-none border-none ring-0 focus:outline-none focus:ring-0 focus:border-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />

              <button
                type="button"
                disabled={isDisabled || maxDepth >= 5}
                onClick={() => setMaxDepth((prev) => Math.min(5, prev + 1))}
                className="flex h-7 w-7 items-center justify-center rounded-md bg-card/80 text-muted transition hover:bg-card hover:text-foreground active:scale-95 disabled:opacity-40"
                aria-label="Increase max depth"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="mt-1 text-[11px] text-muted">
              Max link hop distance from root (type or click + / -).
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
