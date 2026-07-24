"use client";

import React from "react";
import {
  LayoutDashboard,
  Sparkles,
  Globe,
  AlertTriangle,
  Layers,
  CheckCircle2,
  ListTree,
  type LucideIcon,
} from "lucide-react";

export type RunDetailSectionId =
  | "overview"
  | "ai-report"
  | "pages"
  | "findings"
  | "evidence"
  | "checks"
  | "trail";

export type SectionNavItem = {
  id: RunDetailSectionId;
  label: string;
  count?: number;
  icon: LucideIcon;
};

type RunDetailSidebarProps = {
  activeSection: RunDetailSectionId;
  onSelectSection: (sectionId: RunDetailSectionId) => void;
  counts: {
    pageResults: number;
    findings: number;
    evidence: number;
    checks: number;
    trail: number;
  };
  hasReport?: boolean;
};

export function RunDetailSidebar({
  activeSection,
  onSelectSection,
  counts,
  hasReport = false,
}: RunDetailSidebarProps) {
  const items: SectionNavItem[] = [
    {
      id: "overview",
      label: "Overview",
      icon: LayoutDashboard,
    },
    {
      id: "ai-report",
      label: "AI Report",
      icon: Sparkles,
      count: hasReport ? 1 : undefined,
    },
    {
      id: "pages",
      label: "Page Crawl",
      icon: Globe,
      count: counts.pageResults,
    },
    {
      id: "findings",
      label: "Findings",
      icon: AlertTriangle,
      count: counts.findings,
    },
    {
      id: "evidence",
      label: "Evidence",
      icon: Layers,
      count: counts.evidence,
    },
    {
      id: "checks",
      label: "QA Checks",
      icon: CheckCircle2,
      count: counts.checks,
    },
    {
      id: "trail",
      label: "Browser Trail",
      icon: ListTree,
      count: counts.trail,
    },
  ];

  return (
    <nav
      aria-label="Run Detail Sections"
      className="rounded-xl border border-border/80 bg-panel/90 p-3 shadow-sm"
    >
      <div className="hidden md:block mb-2.5 px-3 pt-1">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
          Navigation
        </h3>
      </div>

      {/* Desktop Vertical Menu */}
      <div className="hidden md:flex flex-col gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectSection(item.id)}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition ${
                isActive
                  ? "bg-accent text-background font-semibold shadow-sm"
                  : "text-muted hover:bg-card hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </div>
              {typeof item.count === "number" && item.count > 0 && (
                <span
                  className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-mono ${
                    isActive
                      ? "bg-background/20 text-background"
                      : "bg-card border border-border/60 text-muted"
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Mobile Horizontal Pill Bar */}
      <div className="flex md:hidden overflow-x-auto gap-1.5 pb-1 no-scrollbar">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectSection(item.id)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition ${
                isActive
                  ? "bg-accent text-background font-semibold"
                  : "bg-card border border-border/80 text-muted"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{item.label}</span>
              {typeof item.count === "number" && item.count > 0 && (
                <span className="ml-1 text-[10px] font-mono">
                  ({item.count})
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
