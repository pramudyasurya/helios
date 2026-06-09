import type { OverviewCardData } from "./types";

export const overviewCards: OverviewCardData[] = [
  {
    title: "Evidence",
    emptyText: "No evidence",
    activeText: "Evidence pending",
    completedText: "4 evidence items collected",
  },
  {
    title: "Trail",
    emptyText: "No trail",
    activeText: "1 step queued",
    completedText: "8 trail steps recorded",
  },
  {
    title: "Artifacts",
    emptyText: "No artifacts",
    activeText: "Screenshot pending",
    completedText: "2 screenshots captured",
  },
  {
    title: "Findings",
    emptyText: "No findings",
    activeText: "QA checks pending",
    completedText: "Initial QA summary ready",
  },
];
