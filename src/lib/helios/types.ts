export type RunStatus = "Idle" | "Queued" | "Running" | "Completed" | "Failed";

export type TrailStep = {
  label: string;
  detail: string;
  timestamp: string;
};

export type CheckStatus = "passed" | "warning" | "failed";
export type CheckSeverity = "info" | "low" | "medium" | "high";

export type CheckResult = {
  title: string;
  detail: string;
  status: CheckStatus;
  severity: CheckSeverity;
};

export type LatestRun = {
  id: string;
  startingUrl: string;
  status: RunStatus;
  trail: TrailStep[];
  summary: string;
  checks: CheckResult[];

  createdAt: string;
  finishedAt?: string;
  durationMs?: number;

  finalUrl?: string;
  title?: string;
  artifacts?: {
    desktopScreenshot: string;
    mobileScreenshot: string;
  };
  consoleErrors?: string[];
  failedRequests?: string[];
};

export type OverviewCardData = {
  title: string;
  emptyText: string;
  activeText: string;
  completedText: string;
};
