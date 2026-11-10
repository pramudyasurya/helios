"use client";

import { useState, useEffect } from "react";
import { Globe, ListChecks, Network, PlaySquare, Plus, Minus, Code2, Sliders } from "lucide-react";
import type { JourneyStep } from "@/lib/shared/domain/journey";
import { JourneyStepBuilder } from "./journey-step-builder";

export type RunMode = "single" | "manual" | "crawl" | "journey";

export type RunConfig = {
  mode: RunMode;
  routes?: string[];
  steps?: JourneyStep[];
  maxPages?: number;
  maxDepth?: number;
  projectId?: string;
  environmentId?: string;
  origin?: "manual";
};

type RunOptionsPickerProps = {
  onChange: (config: RunConfig) => void;
  isDisabled?: boolean;
  defaultConfig?: Partial<RunConfig>;
};

export function RunOptionsPicker({
  onChange,
  isDisabled = false,
  defaultConfig,
}: RunOptionsPickerProps) {
  const [mode, setMode] = useState<RunMode>(defaultConfig?.mode ?? "single");
  const [routesText, setRoutesText] = useState(
    defaultConfig?.routes?.join("\n") ?? "",
  );
  const [maxPages, setMaxPages] = useState(defaultConfig?.maxPages ?? 5);
  const [maxDepth, setMaxDepth] = useState(defaultConfig?.maxDepth ?? 2);
  const [stepsText, setStepsText] = useState(
    defaultConfig?.steps
      ? JSON.stringify(defaultConfig.steps, null, 2)
      : `[\n  { "id": "1", "action": "waitForSelector", "selector": "body" },\n  { "id": "2", "action": "assertVisible", "selector": "body" }\n]`,
  );
  const [journeyTab, setJourneyTab] = useState<"builder" | "json">("builder");
  useEffect(() => {
    let routes: string[] | undefined;
    if (mode === "manual") {
      routes = routesText
        .split("\n")
        .map((r) => r.trim())
        .filter(Boolean);
    }

    let steps: JourneyStep[] | undefined;
    if (mode === "journey") {
      try {
        const parsed = JSON.parse(stepsText);
        if (Array.isArray(parsed)) steps = parsed;
      } catch {
        steps = undefined;
      }
    }

    onChange({
      mode,
      routes: mode === "manual" ? routes : undefined,
      steps: mode === "journey" ? steps : undefined,
      maxPages: mode === "crawl" ? maxPages : undefined,
      maxDepth: mode === "crawl" ? maxDepth : undefined,
    });
  }, [mode, routesText, stepsText, maxPages, maxDepth, onChange]);

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
    {
      id: "journey" as RunMode,
      title: "Synthetic Journey",
      description: "Automated clicks, forms & assertions DSL",
      icon: PlaySquare,
    },
  ];

  return (
    <div className="mt-4 rounded-xs border border-border/70 bg-card/40 p-4">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">
          Select QA Execution Mode
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {modeCards.map((card) => {
          const Icon = card.icon;
          const isSelected = mode === card.id;

          return (
            <button
              key={card.id}
              type="button"
              disabled={isDisabled}
              onClick={() => setMode(card.id)}
              className={`flex flex-col text-left rounded-xs p-3 border transition ${
                isSelected
                  ? "border-foreground/50 bg-card text-foreground shadow-xs ring-1 ring-border/80"
                  : "border-border/50 bg-background/50 text-muted hover:border-border hover:bg-card/60"
              } disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              <div className="flex items-center justify-between">
                <Icon
                  className={`h-4 w-4 ${
                    isSelected ? "text-foreground" : "text-muted/70"
                  }`}
                />
                <span
                  className={`h-2 w-2 rounded-full ${
                    isSelected ? "bg-foreground" : "bg-border/60"
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

      {mode === "single" && (
        <p className="mt-3 text-xs text-muted">
          Evaluates the specified URL only. Standard single-page Playwright
          check.
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
            className="mt-1.5 w-full rounded-xs border border-border bg-background px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted outline-none focus:ring-1 focus:ring-accent disabled:opacity-60"
          />
          <p className="mt-1 text-[11px] text-muted">
            Enter relative paths to evaluate sequentially during the run.
          </p>
        </div>
      )}

      {mode === "crawl" && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="max-pages"
              className="block text-xs font-semibold text-foreground"
            >
              Max Pages (1–5)
            </label>
            <div className="mt-1.5 flex items-center rounded-xs bg-background/80 p-1">
              <button
                type="button"
                disabled={isDisabled || maxPages <= 1}
                onClick={() => setMaxPages((prev) => Math.max(1, prev - 1))}
                className="flex h-7 w-7 items-center justify-center rounded-xs bg-card/80 text-muted transition hover:bg-card hover:text-foreground active:scale-95 disabled:opacity-40"
                aria-label="Decrease max pages"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>

              <input
                type="number"
                id="max-pages"
                min={1}
                max={5}
                disabled={isDisabled}
                value={maxPages}
                onChange={(e) =>
                  setMaxPages(
                    Math.min(5, Math.max(1, Number(e.target.value) || 1)),
                  )
                }
                className="w-full bg-transparent text-center font-mono text-xs font-semibold text-foreground outline-none border-none ring-0 focus:outline-none focus:ring-0 focus:border-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />

              <button
                type="button"
                disabled={isDisabled || maxPages >= 5}
                onClick={() => setMaxPages((prev) => Math.min(5, prev + 1))}
                className="flex h-7 w-7 items-center justify-center rounded-xs bg-card/80 text-muted transition hover:bg-card hover:text-foreground active:scale-95 disabled:opacity-40"
                aria-label="Increase max pages"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="mt-1 text-[11px] text-muted">
              Limit internal links to evaluate (type or click + / -).
            </p>
          </div>

          <div>
            <label
              htmlFor="max-depth"
              className="block text-xs font-semibold text-foreground"
            >
              Max Depth (0–2)
            </label>
            <div className="mt-1.5 flex items-center rounded-xs bg-background/80 p-1">
              <button
                type="button"
                disabled={isDisabled || maxDepth <= 0}
                onClick={() => setMaxDepth((prev) => Math.max(0, prev - 1))}
                className="flex h-7 w-7 items-center justify-center rounded-xs bg-card/80 text-muted transition hover:bg-card hover:text-foreground active:scale-95 disabled:opacity-40"
                aria-label="Decrease max depth"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>

              <input
                type="number"
                id="max-depth"
                min={0}
                max={2}
                disabled={isDisabled}
                value={maxDepth}
                onChange={(e) =>
                  setMaxDepth(
                    Math.min(2, Math.max(0, Number(e.target.value) || 0)),
                  )
                }
                className="w-full bg-transparent text-center font-mono text-xs font-semibold text-foreground outline-none border-none ring-0 focus:outline-none focus:ring-0 focus:border-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />

              <button
                type="button"
                disabled={isDisabled || maxDepth >= 2}
                onClick={() => setMaxDepth((prev) => Math.min(2, prev + 1))}
                className="flex h-7 w-7 items-center justify-center rounded-xs bg-card/80 text-muted transition hover:bg-card hover:text-foreground active:scale-95 disabled:opacity-40"
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
      {mode === "journey" && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="journey-steps"
              className="block text-xs font-semibold text-foreground"
            >
              User Journey Steps
            </label>
            <div className="flex items-center rounded-xs bg-background/80 p-0.5 border border-border/60">
              <button
                type="button"
                onClick={() => setJourneyTab("builder")}
                className={`flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-xs transition ${
                  journeyTab === "builder"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted hover:text-foreground"
                }`}
              >
                <Sliders className="h-3 w-3" />
                Visual Builder
              </button>
              <button
                type="button"
                onClick={() => setJourneyTab("json")}
                className={`flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-xs transition ${
                  journeyTab === "json"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted hover:text-foreground"
                }`}
              >
                <Code2 className="h-3 w-3" />
                JSON DSL
              </button>
            </div>
          </div>

          {journeyTab === "builder" ? (
            <JourneyStepBuilder
              steps={(() => {
                try {
                  const parsed = JSON.parse(stepsText);
                  return Array.isArray(parsed) ? parsed : [];
                } catch {
                  return [];
                }
              })()}
              onChange={(newSteps) => setStepsText(JSON.stringify(newSteps, null, 2))}
              isDisabled={isDisabled}
            />
          ) : (
            <>
              <textarea
                id="journey-steps"
                disabled={isDisabled}
                value={stepsText}
                onChange={(e) => setStepsText(e.target.value)}
                rows={6}
                className="mt-1 w-full rounded-xs border border-border bg-background px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted outline-none focus:ring-1 focus:ring-accent disabled:opacity-60"
              />
              <p className="mt-1 text-[11px] text-muted">
                Supported actions: <code>goto</code>, <code>click</code>, <code>fill</code>, <code>select</code>, <code>pressKey</code>, <code>waitForSelector</code>, <code>assertVisible</code>, <code>assertText</code>, <code>assertUrl</code>.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
