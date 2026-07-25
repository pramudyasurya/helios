import type { LucideIcon } from "lucide-react";
import { ImageOff, Terminal, WifiOff } from "lucide-react";
import { MAX_VISIBLE_EVIDENCE_ITEMS } from "@/lib/shared/domain/constants";
import type { RunEvidence, EvidenceStatus } from "@/lib/shared/domain/types";

export const STATUS_STYLES: Record<EvidenceStatus, string> = {
  open: "border-amber-500/30 text-amber-400 bg-amber-500/5",
  resolved: "border-emerald-500/30 text-emerald-400 bg-emerald-500/5",
  ignored: "border-border/70 text-muted bg-card/40",
};

export const INACTIVE_STYLE =
  "border-border/40 bg-transparent text-muted/70 hover:text-foreground hover:bg-card/40";

export type EvidenceFilter = "all" | "images" | "console" | "network";

export type EvidenceSectionConfig = {
  id: Exclude<EvidenceFilter, "all">;
  title: string;
  items: RunEvidence[];
  totalCount: number;
  emptyTitle: string;
  emptyDesc: string;
  icon: LucideIcon;
};

export function getEvidenceSections(
  evidence: RunEvidence[],
  maxVisibleItems: number | undefined,
): EvidenceSectionConfig[] {
  const image = evidence.filter((e) => e.type === "image");
  const console_ = evidence.filter((e) => e.type === "console");
  const network = evidence.filter((e) => e.type === "network");

  return [
    {
      id: "images",
      title: "Broken images",
      items: image.slice(0, maxVisibleItems),
      totalCount: image.length,
      emptyTitle: "No broken images",
      emptyDesc: "No broken images were detected in this run.",
      icon: ImageOff,
    },
    {
      id: "console",
      title: "Console errors",
      items: console_.slice(0, maxVisibleItems),
      totalCount: console_.length,
      emptyTitle: "No console errors",
      emptyDesc: "No console errors were logged in this run.",
      icon: Terminal,
    },
    {
      id: "network",
      title: "Failed network requests",
      items: network.slice(0, maxVisibleItems),
      totalCount: network.length,
      emptyTitle: "No failed requests",
      emptyDesc: "No network requests failed in this run.",
      icon: WifiOff,
    },
  ];
}

export function canToggleEvidence(
  sections: EvidenceSectionConfig[],
  activeFilter: EvidenceFilter,
): boolean {
  return sections.some(
    (s) =>
      (activeFilter === "all" || activeFilter === s.id) &&
      s.totalCount > MAX_VISIBLE_EVIDENCE_ITEMS,
  );
}

export function getVisibleEvidenceText(
  sections: EvidenceSectionConfig[],
  activeFilter: EvidenceFilter,
): string {
  return sections
    .filter((s) => activeFilter === "all" || activeFilter === s.id)
    .filter((s) => s.items.length > 0)
    .map((s) =>
      [
        `${s.title} (${s.items.length})`,
        ...s.items.map((e) => `- ${e.content}`),
      ].join("\n"),
    )
    .join("\n\n");
}
