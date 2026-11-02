export type RunStatus = "Idle" | "Queued" | "Running" | "Completed" | "Failed";

export type TrailStep = {
  label: string;
  detail: string;
  timestamp: string;
};

export type CheckStatus = "passed" | "warning" | "failed";
export type CheckSeverity = "info" | "low" | "medium" | "high";

export type BotChallengeKind = "challenge" | "captcha" | "block";

export type StorageState = {
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    expires: number;
    httpOnly: boolean;
    secure: boolean;
    sameSite: "Strict" | "Lax" | "None";
  }>;
  origins: Array<{
    origin: string;
    localStorage: Array<{ name: string; value: string }>;
  }>;
};
export type A11yViolationNode = {
  target: string[];
  html: string;
  failureSummary?: string;
};

export type A11yViolation = {
  id: string;
  impact: "minor" | "moderate" | "serious" | "critical" | null;
  description: string;
  help: string;
  helpUrl: string;
  nodes: A11yViolationNode[];
};

/**
 * state with empty `cookies` can still be a live session.
 */
export function hasSession(state: StorageState | undefined): boolean {
  if (!state) return false;
  if (state.cookies.length > 0) return true;
  return state.origins.some((origin) => origin.localStorage.length > 0);
}

export type CheckResult = {
  title: string;
  detail: string;
  status: CheckStatus;
  severity: CheckSeverity;
  evidenceType?: EvidenceType;
  evidenceIds?: string[];
};

export type CheckInput = {
  url: string;
  finalUrl?: string;
  statusCode?: number;
  pageStatus?: string;
  botChallenge?: BotChallengeKind;
  loginRedirect?: boolean;
  title?: string;
  description?: string;
  loadMetrics?: LoadMetrics;
  screenshots?: { desktop: string; mobile: string };
  consoleErrors: string[];
  failedRequests: string[];
  brokenImages: string[];
  insecureResources?: string[];
  cookies?: Array<{ name: string; secure: boolean; httpOnly: boolean; sameSite: string }>;
  securityHeaders?: Record<string, string>;
  a11yViolations?: A11yViolation[];
};

export type ResourceBudgets = {
  jsBytes: number;
  cssBytes: number;
  imageBytes: number;
  fontBytes: number;
  totalTransferBytes: number;
  resourceCount: number;
};

export type LoadMetrics = {
  domContentLoadedMs: number;
  loadEventMs: number;
  ttfbMs?: number;
  fcpMs?: number;
  lcpMs?: number;
  cls?: number;
  resources?: ResourceBudgets;
};

export type PageResult = {
  id: string;
  url: string;
  depth: number;
  status: string;
  statusCode?: number;
  botChallenge?: BotChallengeKind;
  loginRedirect?: boolean;

  finalUrl?: string;
  title?: string;
  description?: string;
  durationMs?: number;

  artifacts?: {
    desktopScreenshot: string;
    mobileScreenshot: string;
    trace?: string;
  };
  brokenImages?: string[];
  consoleErrors?: string[];
  failedRequests?: string[];
  insecureResources?: string[];
  cookies?: Array<{ name: string; secure: boolean; httpOnly: boolean; sameSite: string }>;
  securityHeaders?: Record<string, string>;
  a11yViolations?: A11yViolation[];
  loadMetrics?: LoadMetrics;
  checks?: CheckResult[];
  createdAt: string;
  updatedAt: string;
};

export type Project = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
};

export type Environment = {
  id: string;
  projectId: string;
  name: string;
  baseUrl?: string;
  createdAt: string;
  updatedAt: string;
};

export type ProjectWithEnvironments = Project & {
  environments: Environment[];
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
    trace?: string;
  };
  brokenImages?: string[];
  consoleErrors?: string[];
  failedRequests?: string[];
  loadMetrics?: LoadMetrics;
  pageResults?: PageResult[];
  evidence?: RunEvidence[];
  report?: AIReport;

  projectId?: string;
  environmentId?: string;
  projectName?: string;
  environmentName?: string;
  origin?: "manual" | "ci" | "scheduled";
  mode?: "single" | "manual" | "crawl";
  maxPages?: number;
  maxDepth?: number;
};
export type CreateQueuedRunResponse = {
  id: string;
  status: "queued";
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
    trace?: string;
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
export const EVIDENCE_STATUSES = ["open", "resolved", "ignored"] as const;
export type EvidenceStatus = (typeof EVIDENCE_STATUSES)[number];

export type RunEvidence = {
  id: string;
  type: EvidenceType;
  content: string;
  pageUrl: string;
  resourceUrl?: string;
  capturedAt: string;
  status: EvidenceStatus;
  viewport?: string;
  severity?: string;
};

export const AI_RISK_LEVELS = ["low", "medium", "high"] as const;
export type AIRiskLevel = (typeof AI_RISK_LEVELS)[number];

export type AIFinding = {
  title: string;
  severity: AIRiskLevel;
  evidenceIds: string[];
  suggestedFix?: string;
};

export type AIReport = {
  summary: string;
  riskLevel: AIRiskLevel;
  findings: AIFinding[];
  suggestedActions: string[];
  /** Optional reasoning/thinking content from models that provide it (e.g. GLM 5.2). */
  reasoningContent?: string;
};

export type RunStats = {
  totalRuns: number;
  completedRuns: number;
  failedRuns: number;
  avgDurationMs: number;
  recentDurations?: number[];
  timeseries?: TrendPoint[];
};

export type ScheduleMode = "single" | "manual" | "crawl";

export type QaScheduleView = {
  id: string;
  environmentId: string;
  cronExpression: string;
  timezone: string;
  mode: ScheduleMode;
  routes: string[];
  maxPages: number | null;
  maxDepth: number | null;
  active: boolean;
  lastFiredAt: string | null;
  nextRunAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type IssueDiff = {
  fingerprint: string;
  title: string;
  type: EvidenceType;
  severity: CheckSeverity;
  evidenceIds: string[];
  status: "new" | "recurring" | "resolved";
};

export type MetricDelta = {
  key: string;
  label: string;
  from: number | null;
  to: number | null;
  delta: number | null;
  percentChange: number | null;
  direction: "improved" | "regressed" | "unchanged";
};

export type RunComparison = {
  runA: { id: string; createdAt: string };
  runB: { id: string; createdAt: string };
  newIssues: IssueDiff[];
  resolvedIssues: IssueDiff[];
  recurringIssues: IssueDiff[];
  metricDeltas: MetricDelta[];
};

export type TrendPoint = {
  date: string;
  runId: string;
  passRate: number;
  errorCount: number;
  lcpMs?: number | null;
  cls?: number | null;
  ttfbMs?: number | null;
};
export type PaginatedResponse<T> = {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};
