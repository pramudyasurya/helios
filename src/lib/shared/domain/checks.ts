import type { CheckInput, CheckResult, CheckStatus, CheckSeverity, CreateRunResponse, PageResult } from "@/lib/shared/domain/types";
import {
  getDomLoadStatus,
  formatDomLoadMetric,
} from "@/lib/shared/domain/performance";

export function runPageChecks(input: CheckInput): CheckResult[] {
  const finalUrl = input.finalUrl ?? input.url;
  const title = input.title ?? "";
  const hasDescription =
    input.description !== undefined && input.description.trim().length > 0;
  const hasBrokenImages = input.brokenImages.length > 0;
  const hasConsoleErrors = input.consoleErrors.length > 0;
  const hasFailedRequests = input.failedRequests.length > 0;
  const hasDesktopScreenshot = Boolean(input.screenshots?.desktop);
  const hasMobileScreenshot = Boolean(input.screenshots?.mobile);
  const domLoadStatus = input.loadMetrics
    ? getDomLoadStatus(input.loadMetrics.domContentLoadedMs)
    : undefined;

  return [
    {
      title: "Page loaded successfully",
      detail: `Playwright loaded the page and resolved to ${finalUrl}.`,
      status: "passed",
      severity: "info",
    },
    {
      title: "Page load metrics captured",
      detail: input.loadMetrics
        ? `DOM loaded in ${formatDomLoadMetric(input.loadMetrics.domContentLoadedMs)}.`
        : "Page load metrics were not available.",
      status: domLoadStatus?.status ?? "warning",
      severity: domLoadStatus?.severity ?? "low",
    },
    {
      title: "Page title checked",
      detail:
        title.trim().length > 0
          ? `Page title captured: ${title}.`
          : "No page title was captured.",
      status: title.trim().length > 0 ? "passed" : "warning",
      severity: title.trim().length > 0 ? "info" : "low",
    },
    {
      title: "Meta description checked",
      detail: hasDescription
        ? "Meta description was captured."
        : "No meta description was captured.",
      status: hasDescription ? "passed" : "warning",
      severity: hasDescription ? "info" : "low",
    },
    {
      title: "Desktop screenshot captured",
      detail: hasDesktopScreenshot
        ? "A desktop viewport screenshot was captured from the real browser run."
        : "No desktop viewport screenshot was captured.",
      status: hasDesktopScreenshot ? "passed" : "warning",
      severity: hasDesktopScreenshot ? "info" : "low",
    },
    {
      title: "Mobile screenshot captured",
      detail: hasMobileScreenshot
        ? "A mobile viewport screenshot was captured from the real browser run."
        : "No mobile viewport screenshot was captured.",
      status: hasMobileScreenshot ? "passed" : "warning",
      severity: hasMobileScreenshot ? "info" : "low",
    },
    {
      title: "Broken images checked",
      detail: hasBrokenImages
        ? `${input.brokenImages.length} broken image(s) found.`
        : "No broken images were found.",
      status: hasBrokenImages ? "warning" : "passed",
      severity: hasBrokenImages ? "medium" : "info",
      evidenceType: hasBrokenImages ? "image" : undefined,
    },
    {
      title: "Console errors checked",
      detail: hasConsoleErrors
        ? `${input.consoleErrors.length} console error(s) captured.`
        : "No console errors were captured.",
      status: hasConsoleErrors ? "warning" : "passed",
      severity: hasConsoleErrors ? "low" : "info",
      evidenceType: hasConsoleErrors ? "console" : undefined,
    },
    {
      title: "Failed network requests checked",
      detail: hasFailedRequests
        ? `${input.failedRequests.length} failed request(s) captured.`
        : "No failed network requests were captured.",
      status: hasFailedRequests ? "warning" : "passed",
      severity: hasFailedRequests ? "medium" : "info",
      evidenceType: hasFailedRequests ? "network" : undefined,
    },
  ];
}

const STATUS_RANK: Record<CheckStatus, number> = {
  failed: 3,
  warning: 2,
  passed: 1,
};

const SEVERITY_RANK: Record<CheckSeverity, number> = {
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};

export function runChecks(inputs: CheckInput[]): CheckResult[] {
  if (inputs.length === 0) return [];
  if (inputs.length === 1) return runPageChecks(inputs[0]);

  const pages = inputs.map(runPageChecks);

  // runPageChecks emits a fixed set of checks in a stable order, so grouping
  // the per-page results by title merges corresponding checks across pages.
  const byTitle = new Map<string, CheckResult[]>();
  for (const page of pages) {
    for (const check of page) {
      const group = byTitle.get(check.title);
      if (group) {
        group.push(check);
      } else {
        byTitle.set(check.title, [check]);
      }
    }
  }

  // Map preserves insertion order, so iterating its entries keeps the stable
  // check order produced by runPageChecks.
  return Array.from(byTitle.entries()).map(([title, checks]) => {
    // Worst status wins; the detail comes from the page that produced it.
    let worst = checks[0];
    for (const candidate of checks) {
      if (STATUS_RANK[candidate.status] > STATUS_RANK[worst.status]) {
        worst = candidate;
      }
    }

    // Severity is ranked independently, so a fast-but-erroring page still
    // surfaces the highest observed severity.
    let severity = worst.severity;
    for (const candidate of checks) {
      if (SEVERITY_RANK[candidate.severity] > SEVERITY_RANK[severity]) {
        severity = candidate.severity;
      }
    }

    const evidenceType = checks.find(
      (check) => check.evidenceType !== undefined,
    )?.evidenceType;

    return {
      title,
      detail: worst.detail,
      status: worst.status,
      severity,
      evidenceType,
    };
  });
}

export function toCheckInput(page: PageResult): CheckInput {
  return {
    url: page.url,
    finalUrl: page.finalUrl,
    statusCode: page.statusCode,
    title: page.title,
    description: page.description,
    loadMetrics: page.loadMetrics,
    screenshots: page.artifacts
      ? {
          desktop: page.artifacts.desktopScreenshot,
          mobile: page.artifacts.mobileScreenshot,
        }
      : undefined,
    consoleErrors: page.consoleErrors ?? [],
    failedRequests: page.failedRequests ?? [],
    brokenImages: page.brokenImages ?? [],
  };
}

/**
 * @deprecated Replaced by runChecks(CheckInput[]). Retained only for test compatibility.
 */
export function createChecksFromRunResult(
  result: CreateRunResponse,
): CheckResult[] {
  return runPageChecks({
    url: result.startingUrl,
    finalUrl: result.finalUrl,
    title: result.title,
    description: result.description,
    loadMetrics: result.loadMetrics,
    screenshots: {
      desktop: result.artifacts.desktopScreenshot,
      mobile: result.artifacts.mobileScreenshot,
    },
    consoleErrors: result.consoleErrors,
    failedRequests: result.failedRequests,
    brokenImages: result.brokenImages,
  });
}
