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
  evidenceType?: EvidenceType;
};

export type LoadMetrics = {
  domContentLoadedMs: number;
  loadEventMs: number;
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
  description?: string;
  artifacts?: {
    desktopScreenshot: string;
    mobileScreenshot: string;
  };
  brokenImages?: string[];
  consoleErrors?: string[];
  failedRequests?: string[];
  loadMetrics?: LoadMetrics;
};

export type CreateRunResponse = {
  id: string;
  startingUrl: string;
  finalUrl: string;
  status: "Completed";
  title: string;
  description?: string;
  createdAt: string;
  finishedAt: string;
  durationMs: number;
  summary: string;
  trail: TrailStep[];
  artifacts: {
    desktopScreenshot: string;
    mobileScreenshot: string;
  };
  brokenImages: string[];
  consoleErrors: string[];
  failedRequests: string[];
  loadMetrics?: LoadMetrics;
};

export type OverviewCardData = {
  title: string;
  emptyText: string;
  activeText: string;
  completedText: string;
};

export type EvidenceType = "image" | "console" | "network";

export type RunEvidence = {
  id: string;
  type: EvidenceType;
  content: string;
  pageUrl: string;
  resourceUrl?: string;
  capturedAt: string;
};
