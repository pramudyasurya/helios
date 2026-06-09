export type RunStatus = "Idle" | "Queued" | "Running" | "Completed";

export type TrailStep = {
  label: string;
  detail: string;
};

export type LatestRun = {
  id: string;
  startingUrl: string;
  status: RunStatus;
  createdAt: string;
  trail: TrailStep[];
};

export type OverviewCardData = {
  title: string;
  emptyText: string;
  activeText: string;
  completedText: string;
};
