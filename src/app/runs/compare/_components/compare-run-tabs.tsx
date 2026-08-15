"use client";

import { useId, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  CirclePlus,
  Minus,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDurationMs, formatLabel } from "@/lib/shared/domain/format";
import type { CheckTransition } from "@/lib/shared/domain/check-comparison";
import type {
  IssueDiff,
  MetricDelta,
  RunComparison,
} from "@/lib/shared/domain/run-comparison";
import type { CheckStatus } from "@/lib/shared/domain/types";

type CompareRunTabsProps = {
  comparison: RunComparison;
  checkTransitions: CheckTransition[];
};

type TabId = "issues" | "checks" | "metrics";

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
};

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
  if (TIME_METRIC_KEYS[delta.key]) return formatDurationMs(value);
  return String(value);
}

function formatMetricDeltaText(delta: MetricDelta): string {
  if (delta.delta === null) return "—";

  let text: string;
  if (TIME_METRIC_KEYS[delta.key]) {
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

        return (
          <li
            key={delta.key}
            className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="text-sm text-foreground">{delta.label}</p>
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

export function CompareRunTabs({
  comparison,
  checkTransitions,
}: CompareRunTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("issues");
  const tabListId = useId();

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
      </div>
    </div>
  );
}
