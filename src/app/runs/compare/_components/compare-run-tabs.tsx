"use client";

import { useId, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  CirclePlus,
  Eye,
  Image as ImageIcon,
  Minus,
  Monitor,
  RefreshCw,
  Smartphone,
  type LucideIcon,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDurationMs, formatLabel } from "@/lib/shared/domain/format";
import { CWV_THRESHOLDS } from "@/lib/shared/domain/performance";
import type { CheckTransition } from "@/lib/shared/domain/check-comparison";
import type {
  IssueDiff,
  MetricDelta,
  RunComparison,
} from "@/lib/shared/domain/run-comparison";
import type {
  CheckStatus,
  VisualDiffComparison,
} from "@/lib/shared/domain/types";

type CompareRunTabsProps = {
  comparison: RunComparison;
  checkTransitions: CheckTransition[];
  visualDiff?: VisualDiffComparison | null;
};

type TabId = "issues" | "checks" | "metrics" | "visual";
const DIRECTION_META: Record<
  CheckTransition["direction"],
  { label: string; icon: LucideIcon; tone: string }
> = {
  improved: { label: "Improved", icon: ArrowUpRight, tone: "text-success" },
  regressed: { label: "Regressed", icon: ArrowDownRight, tone: "text-danger" },
  unchanged: { label: "Unchanged", icon: Minus, tone: "text-muted" },
  added: { label: "Added", icon: CirclePlus, tone: "text-accent" },
  removed: { label: "Removed", icon: Minus, tone: "text-muted" },
};

const CHECK_STATUS_TONE: Record<CheckStatus, string> = {
  passed: "text-success border-success",
  warning: "text-accent border-accent",
  failed: "text-danger border-danger",
};

const ISSUE_GROUPS: {
  key: "new" | "resolved" | "recurring";
  label: string;
  icon: LucideIcon;
  tone: string;
}[] = [
  { key: "new", label: "New", icon: CirclePlus, tone: "text-danger" },
  { key: "resolved", label: "Resolved", icon: CheckCircle2, tone: "text-success" },
  { key: "recurring", label: "Recurring", icon: RefreshCw, tone: "text-accent" },
];

const TIME_METRIC_KEYS: Record<string, true> = {
  durationMs: true,
  domContentLoadedMs: true,
  lcpMs: true,
  ttfbMs: true,
};

function getCwvBenchmark(key: string, value: number | null): { label: string; tone: string } | null {
  if (value === null) return null;
  if (key === "lcpMs") {
    if (value <= CWV_THRESHOLDS.LCP_GOOD_MS) return { label: "Good", tone: "border-success/40 text-success bg-success/10" };
    if (value <= CWV_THRESHOLDS.LCP_POOR_MS) return { label: "Needs Imp.", tone: "border-accent/40 text-accent bg-accent/10" };
    return { label: "Poor", tone: "border-danger/40 text-danger bg-danger/10" };
  }
  if (key === "cls") {
    if (value <= CWV_THRESHOLDS.CLS_GOOD) return { label: "Good", tone: "border-success/40 text-success bg-success/10" };
    if (value <= CWV_THRESHOLDS.CLS_POOR) return { label: "Needs Imp.", tone: "border-accent/40 text-accent bg-accent/10" };
    return { label: "Poor", tone: "border-danger/40 text-danger bg-danger/10" };
  }
  if (key === "ttfbMs") {
    if (value <= CWV_THRESHOLDS.TTFB_GOOD_MS) return { label: "Good", tone: "border-success/40 text-success bg-success/10" };
    if (value <= CWV_THRESHOLDS.TTFB_POOR_MS) return { label: "Needs Imp.", tone: "border-accent/40 text-accent bg-accent/10" };
    return { label: "Poor", tone: "border-danger/40 text-danger bg-danger/10" };
  }
  return null;
}

function issuesForGroup(
  comparison: RunComparison,
  key: "new" | "resolved" | "recurring",
): IssueDiff[] {
  switch (key) {
    case "new":
      return comparison.newIssues;
    case "resolved":
      return comparison.resolvedIssues;
    case "recurring":
      return comparison.recurringIssues;
  }
}

function formatMetricValue(delta: MetricDelta, value: number | null): string {
  if (value === null) return "—";
  if (delta.key === "cls") return value.toFixed(3);
  if (TIME_METRIC_KEYS[delta.key]) return formatDurationMs(value);
  return String(value);
}
function formatMetricDeltaText(delta: MetricDelta): string {
  if (delta.delta === null) return "—";

  let text: string;
  if (delta.key === "cls") {
    text = `${delta.delta > 0 ? "+" : ""}${delta.delta.toFixed(3)}`;
  } else if (TIME_METRIC_KEYS[delta.key]) {
    const seconds = delta.delta / 1000;
    text = `${seconds > 0 ? "+" : ""}${seconds.toFixed(2)}s`;
  } else {
    text = `${delta.delta > 0 ? "+" : ""}${delta.delta}`;
  }

  if (delta.percentChange !== null) {
    const sign = delta.percentChange > 0 ? "+" : "";
    text += ` (${sign}${delta.percentChange.toFixed(1)}%)`;
  }

  return text;
}
function IssuesPanel({ comparison }: { comparison: RunComparison }) {
  const total =
    comparison.newIssues.length +
    comparison.resolvedIssues.length +
    comparison.recurringIssues.length;

  if (total === 0) {
    return (
      <EmptyState
        title="No issue changes"
        description="No new, resolved, or recurring issues were detected between these runs."
        icon={CirclePlus}
      />
    );
  }

  return (
    <div className="space-y-6">
      {ISSUE_GROUPS.map((group) => {
        const Icon = group.icon;
        const issues = issuesForGroup(comparison, group.key);

        return (
          <section key={group.key}>
            <h3
              className={`flex items-center gap-1.5 text-sm font-medium ${group.tone}`}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{group.label}</span>
              <span className="font-normal text-muted">({issues.length})</span>
            </h3>
            {issues.length === 0 ? (
              <p className="mt-1 text-xs text-muted">None in this comparison.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {issues.map((issue) => (
                  <li
                    key={issue.fingerprint}
                    className="rounded-xs border border-border/60 bg-card/30 px-3 py-2"
                  >
                    <p className="text-sm text-foreground">{issue.title}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {formatLabel(issue.type)} · {formatLabel(issue.severity)}{" "}
                      severity
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

function CheckStatusBadge({ status }: { status: CheckStatus }) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-xs ${CHECK_STATUS_TONE[status]}`}
    >
      {formatLabel(status)}
    </span>
  );
}

function ChecksPanel({ transitions }: { transitions: CheckTransition[] }) {
  if (transitions.length === 0) {
    return (
      <EmptyState
        title="No checks run"
        description="Neither run executed any automated QA checks to compare."
        icon={Minus}
      />
    );
  }

  return (
    <ul className="space-y-3">
      {transitions.map((transition) => {
        const meta = DIRECTION_META[transition.direction];
        const Icon = meta.icon;

        return (
          <li
            key={transition.title}
            className="border-b border-border/60 pb-3 last:border-b-0 last:pb-0"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-foreground">{transition.title}</p>
              <span
                className={`flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${meta.tone}`}
              >
                <Icon className="h-3 w-3" aria-hidden="true" />
                {formatLabel(transition.direction)}
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-2 text-xs">
              {transition.from ? (
                <CheckStatusBadge status={transition.from} />
              ) : (
                <span className="text-muted">—</span>
              )}
              <span className="text-muted" aria-hidden="true">
                →
              </span>
              {transition.to ? (
                <CheckStatusBadge status={transition.to} />
              ) : (
                <span className="text-muted">—</span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function MetricsPanel({ deltas }: { deltas: MetricDelta[] }) {
  return (
    <ul className="divide-y divide-border/60">
      {deltas.map((delta) => {
        const meta = DIRECTION_META[delta.direction];
        const Icon = meta.icon;
        const benchmark = getCwvBenchmark(delta.key, delta.to);

        return (
          <li
            key={delta.key}
            className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm text-foreground">{delta.label}</p>
                {benchmark && (
                  <span
                    className={`rounded-full border px-1.5 py-0.2 font-mono text-[10px] ${benchmark.tone}`}
                  >
                    {benchmark.label}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-muted">
                {formatMetricValue(delta, delta.from)} →{" "}
                {formatMetricValue(delta, delta.to)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm text-foreground">
                {formatMetricDeltaText(delta)}
              </span>
              <span
                className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${meta.tone}`}
              >
                <Icon className="h-3 w-3" aria-hidden="true" />
                {meta.label}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
function VisualDiffPanel({ visualDiff }: { visualDiff?: VisualDiffComparison | null }) {
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const [mode, setMode] = useState<"side-by-side" | "diff" | "slider">("side-by-side");
  const [sliderOpacity, setSliderOpacity] = useState<number>(50);
  if (!visualDiff || visualDiff.items.length === 0) {
    return (
      <EmptyState
        title="No visual artifacts available"
        description="Screenshots were not captured or are unavailable for one or both of these runs."
        icon={ImageIcon}
      />
    );
  }

  const currentItem = visualDiff.items.find((item) => item.viewport === viewport) ?? visualDiff.items[0];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xs border border-border/80 bg-card/60 p-0.5">
            <button
              type="button"
              onClick={() => setViewport("desktop")}
              className={`flex items-center gap-1.5 rounded-xs px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                viewport === "desktop"
                  ? "bg-foreground/10 text-foreground font-semibold"
                  : "text-muted hover:text-foreground"
              }`}
              aria-pressed={viewport === "desktop"}
            >
              <Monitor className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Desktop</span>
            </button>
            <button
              type="button"
              onClick={() => setViewport("mobile")}
              className={`flex items-center gap-1.5 rounded-xs px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                viewport === "mobile"
                  ? "bg-foreground/10 text-foreground font-semibold"
                  : "text-muted hover:text-foreground"
              }`}
              aria-pressed={viewport === "mobile"}
            >
              <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Mobile</span>
            </button>
          </div>

          <div className="flex items-center rounded-xs border border-border/80 bg-card/60 p-0.5">
            <button
              type="button"
              onClick={() => setMode("side-by-side")}
              className={`rounded-xs px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                mode === "side-by-side"
                  ? "bg-foreground/10 text-foreground font-semibold"
                  : "text-muted hover:text-foreground"
              }`}
              aria-pressed={mode === "side-by-side"}
            >
              Side by Side
            </button>
            <button
              type="button"
              onClick={() => setMode("diff")}
              className={`flex items-center gap-1 rounded-xs px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                mode === "diff"
                  ? "bg-foreground/10 text-foreground font-semibold"
                  : "text-muted hover:text-foreground"
              }`}
              aria-pressed={mode === "diff"}
            >
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Diff Map</span>
            </button>
            <button
              type="button"
              onClick={() => setMode("slider")}
              className={`flex items-center gap-1 rounded-xs px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                mode === "slider"
                  ? "bg-foreground/10 text-foreground font-semibold"
                  : "text-muted hover:text-foreground"
              }`}
              aria-pressed={mode === "slider"}
            >
              <span>Cross-Fade Slider</span>
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs">
          {currentItem.status === "missing" ? (
            <span className="rounded-xs border border-border/70 bg-card/40 px-2 py-0.5 font-mono text-muted">
              Missing Screenshot Artifacts
            </span>
          ) : currentItem.hasDiff ? (
            <div className="flex items-center gap-2">
              <span className="font-mono text-muted">
                {currentItem.diffPixelCount.toLocaleString()} px changed
              </span>
              <span className="rounded-xs border border-danger/40 bg-danger/10 px-2 py-0.5 font-mono font-medium text-danger">
                {currentItem.diffPercentage}% diff
              </span>
            </div>
          ) : (
            <span className="rounded-xs border border-success/40 bg-success/10 px-2 py-0.5 font-mono font-medium text-success">
              0.00% diff (Identical)
            </span>
          )}
        </div>
      </div>

      {currentItem.status === "missing" ? (
        <div className="rounded-xs border border-border/60 bg-card/20 p-8 text-center text-xs text-muted">
          Screenshots for {viewport} view are not present in artifact storage.
        </div>
      ) : mode === "side-by-side" ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted">
              <span className="font-medium text-foreground">Run A (Baseline)</span>
              <span className="font-mono text-[11px]">{currentItem.width} × {currentItem.height}</span>
            </div>
            <div className="overflow-hidden rounded-xs border border-border/80 bg-black/40">
              {currentItem.runAImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentItem.runAImage}
                  alt="Run A baseline screenshot"
                  className="w-full object-contain"
                  loading="lazy"
                />
              ) : (
                <div className="p-8 text-center text-xs text-muted">No image</div>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted">
              <span className="font-medium text-foreground">Run B (Target)</span>
              <span className="font-mono text-[11px]">{currentItem.width} × {currentItem.height}</span>
            </div>
            <div className="overflow-hidden rounded-xs border border-border/80 bg-black/40">
              {currentItem.runBImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentItem.runBImage}
                  alt="Run B target screenshot"
                  className="w-full object-contain"
                  loading="lazy"
                />
              ) : (
                <div className="p-8 text-center text-xs text-muted">No image</div>
              )}
            </div>
          </div>
        </div>
      ) : mode === "slider" ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
            <span className="font-medium text-foreground">
              Cross-Fade Comparison: Run A ({100 - sliderOpacity}%) &harr; Run B ({sliderOpacity}%)
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono">Run A</span>
              <input
                type="range"
                min="0"
                max="100"
                value={sliderOpacity}
                onChange={(e) => setSliderOpacity(Number(e.target.value))}
                className="w-36 sm:w-48 accent-amber-500 cursor-pointer"
                aria-label="Cross-fade opacity slider between Run A and Run B"
              />
              <span className="text-[11px] font-mono">Run B</span>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-xs border border-border/80 bg-black/40 min-h-[300px]">
            {currentItem.runAImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentItem.runAImage}
                alt="Run A baseline screenshot"
                className="w-full object-contain"
                loading="lazy"
              />
            )}
            {currentItem.runBImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentItem.runBImage}
                alt="Run B target screenshot"
                className="absolute inset-0 w-full h-full object-contain pointer-events-none transition-opacity duration-75"
                style={{ opacity: sliderOpacity / 100 }}
                loading="lazy"
              />
            )}
            {!currentItem.runAImage && !currentItem.runBImage && (
              <div className="p-8 text-center text-xs text-muted">
                Screenshots unavailable for comparison
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted">
            <span className="font-medium text-foreground">
              Difference Map (Changed pixels highlighted in magenta)
            </span>
            <span className="font-mono text-[11px]">{currentItem.width} × {currentItem.height}</span>
          </div>
          <div className="overflow-hidden rounded-xs border border-border/80 bg-black/40">
            {currentItem.diffImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentItem.diffImage}
                alt="Visual diff heatmap overlay"
                className="mx-auto max-h-[700px] w-auto object-contain"
                loading="lazy"
              />
            ) : (
              <div className="p-8 text-center text-xs text-muted">
                Diff overlay unavailable
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function CompareRunTabs({
  comparison,
  checkTransitions,
  visualDiff,
}: CompareRunTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("issues");
  const tabListId = useId();

  const visualDiffCount = visualDiff?.items.filter((item) => item.hasDiff).length ?? 0;

  const tabs: { id: TabId; label: string; count: number }[] = [
    {
      id: "issues",
      label: "Issues",
      count:
        comparison.newIssues.length +
        comparison.resolvedIssues.length +
        comparison.recurringIssues.length,
    },
    {
      id: "checks",
      label: "Checks",
      count: checkTransitions.filter(
        (transition) => transition.direction !== "unchanged",
      ).length,
    },
    {
      id: "metrics",
      label: "Metrics",
      count: comparison.metricDeltas.filter(
        (delta) => delta.direction !== "unchanged",
      ).length,
    },
    {
      id: "visual",
      label: "Visual Diff",
      count: visualDiffCount,
    },
  ];

  return (
    <div className="space-y-4">
      <nav
        role="tablist"
        aria-orientation="horizontal"
        aria-label="Comparison sections"
        className="flex flex-wrap items-center gap-1 border-b border-border/80 px-1"
      >
        {tabs.map((tab, index) => {
          const isActive = activeTab === tab.id;
          const tabId = `${tabListId}-tab-${tab.id}`;
          const panelId = `${tabListId}-panel-${tab.id}`;

          return (
            <button
              key={tab.id}
              id={tabId}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={panelId}
              aria-setsize={tabs.length}
              aria-posinset={index + 1}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-xs font-medium transition-all cursor-pointer -mb-px ${
                isActive
                  ? "border-foreground/40 font-semibold text-foreground"
                  : "border-transparent text-muted hover:border-border/60 hover:text-foreground"
              }`}
            >
              <span>{tab.label}</span>
              <span className="rounded-xs border border-border/60 bg-card px-1.5 py-0.5 font-mono text-[10px] text-muted">
                {tab.count}
              </span>
            </button>
          );
        })}
      </nav>
      <div
        role="tabpanel"
        id={`${tabListId}-panel-${activeTab}`}
        aria-labelledby={`${tabListId}-tab-${activeTab}`}
        className="rounded-xs border border-border/80 bg-panel/90 p-5 shadow-sm"
      >
        {activeTab === "issues" && <IssuesPanel comparison={comparison} />}
        {activeTab === "checks" && (
          <ChecksPanel transitions={checkTransitions} />
        )}
        {activeTab === "metrics" && (
          <MetricsPanel deltas={comparison.metricDeltas} />
        )}
        {activeTab === "visual" && (
          <VisualDiffPanel visualDiff={visualDiff} />
        )}
      </div>
    </div>
  );
}
