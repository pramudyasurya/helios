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
  shortLabel: string;
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
      shortLabel: "Overview",
      icon: LayoutDashboard,
    },
    {
      id: "ai-report",
      label: "AI Report",
      shortLabel: "Report",
      icon: Sparkles,
      count: hasReport ? 1 : undefined,
    },
    {
      id: "pages",
      label: "Page Crawl",
      shortLabel: "Crawl",
      icon: Globe,
      count: counts.pageResults,
    },
    {
      id: "findings",
      label: "Findings",
      shortLabel: "Findings",
      icon: AlertTriangle,
      count: counts.findings,
    },
    {
      id: "evidence",
      label: "Evidence",
      shortLabel: "Evidence",
      icon: Layers,
      count: counts.evidence,
    },
    {
      id: "checks",
      label: "QA Checks",
      shortLabel: "Checks",
      icon: CheckCircle2,
      count: counts.checks,
    },
    {
      id: "trail",
      label: "Browser Trail",
      shortLabel: "Trail",
      icon: ListTree,
      count: counts.trail,
    },
  ];

  return (
    <nav
      aria-label="Run Detail Sections"
      className="border-b border-border/80 flex flex-wrap items-center gap-1 sm:gap-1.5 px-1 pt-1"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeSection === item.id;

        return (
          <button
            key={item.id}
            onClick={() => onSelectSection(item.id)}
            title={item.label}
            className={`flex items-center gap-1.5 sm:gap-2 whitespace-nowrap px-2.5 sm:px-3 py-2 text-xs font-medium border-b-2 transition-all cursor-pointer -mb-px ${
              isActive
                ? "border-foreground/40 text-foreground font-semibold"
                : "border-transparent text-muted hover:text-foreground hover:border-border/60"
            }`}
          >
            <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-foreground" : "text-muted"}`} />
            <span className="hidden md:inline">{item.label}</span>
            <span className="inline md:hidden">{item.shortLabel}</span>
            {typeof item.count === "number" && item.count > 0 && (
              <span
                className={`rounded-xs px-1.5 py-0.2 text-[10px] font-mono ${
                  isActive
                    ? "bg-card border border-border/60 text-foreground font-bold"
                    : "bg-card border border-border/60 text-muted"
                }`}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
