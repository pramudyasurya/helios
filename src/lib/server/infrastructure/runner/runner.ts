import "server-only";
import { chromium, type Route, type Request, type Browser, type BrowserContext, type Page } from "playwright";
import { lookup } from "node:dns/promises";
import { randomUUID } from "node:crypto";

import type { PageResult, StorageState, TrailStep, A11yViolation } from "@/lib/shared/domain/types";
import { hasSession } from "@/lib/shared/domain/types";
import AxeBuilder from "@axe-core/playwright";
import { PAGE_GOTO_TIMEOUT_MS } from "@/lib/shared/domain/constants";
import { derivePageStatus } from "@/lib/shared/domain/checks";
import {
  detectBotChallenge,
  isLoginRedirect,
} from "@/lib/shared/domain/bot-protection";

import { getErrorMessage } from "@/lib/shared/domain/errors";
import { getPlaywrightErrorMessage } from "@/lib/server/infrastructure/runner/errors";
import { capturePageMetadata } from "@/lib/server/infrastructure/runner/metadata";
import { VITALS_INIT_SCRIPT } from "@/lib/server/infrastructure/runner/vitals-script";
import {
  attachPageEvidenceListeners,
  captureBrokenImages,
  createBrowserEvidenceCollector,
} from "@/lib/server/infrastructure/runner/evidence";
import { captureRunScreenshots, saveRunTrace } from "@/lib/server/infrastructure/runner/artifacts";
import { waitForPageToSettle } from "@/lib/server/infrastructure/runner/navigation";
import {
  createTrailStep,
  createTerminalRunTrailStep,
  getTerminalRunOutcome,
  appendRunTrailStep,
  formatDisplayUrl,
} from "@/lib/server/infrastructure/runner/trail";
import { isIpPrivate, allowLocalTargets } from "@/lib/shared/domain/validators";
import {
  createCrawlQueue,
  enqueueCrawlLinks,
  extractLinks,
  takeNextCrawlPage,
  type CrawlOptions,
} from "@/lib/server/infrastructure/runner/crawler";
import {
  pageResultToCreateInput,
  persistPageEvidence,
} from "@/lib/server/infrastructure/runner/evidence-builder";
import { prisma } from "@/lib/server/infrastructure/db/prisma";
const activeBrowsers = new Set<Browser>();

/**
 * Closes any lingering Playwright Chromium browser instances.
 * Used on worker shutdown or process exit to prevent orphaned zombie processes.
 */
export async function closeAllActiveBrowsers(): Promise<number> {
  const count = activeBrowsers.size;
  if (count === 0) return 0;

  const closers = Array.from(activeBrowsers).map(async (browser) => {
    try {
      await browser.close();
    } catch {
      // Ignore errors on force-close during teardown
    } finally {
      activeBrowsers.delete(browser);
    }
  });

  await Promise.allSettled(closers);
  activeBrowsers.clear();
  return count;
}

export type RunMode = "single" | "manual" | "crawl";
export type RunMultiRouteQAProps = {
  submittedUrl: string;
  runId: string;
  mode: RunMode;
  routes?: string[];
  maxPages?: number;
  maxDepth?: number;
  storageState?: StorageState;
};

export type MultiRouteRunResult = {
  id: string;
  status: "Completed" | "Failed";
  createdAt: string;
  finishedAt: string;
  durationMs: number;
  pageResults: PageResult[];
  summary: string;
  trail: TrailStep[];
};

async function handleRoute(
  route: Route,
  request: Request,
  dnsCache: Map<string, boolean>,
) {
  try {
    const result = new URL(request.url());

    if (result.protocol !== "http:" && result.protocol !== "https:") {
      await route.continue();
      return true;
    }

    if (await isPrivateHostOrIp(result.hostname, dnsCache)) {
      await route.abort("blockedbyclient");
      return false;
    }

    await route.continue();
    return true;
  } catch {
    await route.abort("blockedbyclient");
    return false;
  }
}

export async function isPrivateHostOrIp(
  hostOrIp: string,
  dnsCache?: Map<string, boolean>,
): Promise<boolean> {
  if (allowLocalTargets()) return false;

  if (isIpPrivate(hostOrIp)) return true;

  if (dnsCache?.has(hostOrIp)) {
    return dnsCache.get(hostOrIp)!;
  }

  try {
    const result = await lookup(hostOrIp, { all: true });
    const isPrivate = result.some((r) => isIpPrivate(r.address));

    dnsCache?.set(hostOrIp, isPrivate);
    return isPrivate;
  } catch {
    return false;
  }
}

export async function runMultiRouteQA({
  submittedUrl,
  runId,
  mode,
  routes = [],
  maxPages,
  maxDepth,
  storageState,
}: RunMultiRouteQAProps): Promise<MultiRouteRunResult> {
  const startedAt = new Date();
  const options: CrawlOptions = { maxPages, maxDepth };
  const queueOptions = mode === "single" ? { maxPages: 1, maxDepth: 0 } : options;
  let queue = createCrawlQueue(submittedUrl, queueOptions);
  const startingPage = queue.pending[0];

  if (!startingPage) {
    throw new Error("The submitted URL could not be queued for QA.");
  }

  if (mode === "manual") {
    queue = enqueueCrawlLinks({
      state: queue,
      originUrl: startingPage.url,
      parent: startingPage,
      links: routes,
      options,
    });
  }

  const dnsCache = new Map<string, boolean>();
  const pageResults: PageResult[] = [];
  const trail: TrailStep[] = [
    createTrailStep({
      label: "Browser launched",
      detail: "Playwright launched a Chromium browser instance.",
      timestamp: startedAt.toISOString(),
    }),
  ];
  let browser: Browser | undefined;

  try {
    browser = await chromium.launch();
    activeBrowsers.add(browser);
    await appendRunTrailStep({
      runId,
      step: {
        label: "Browser launched",
        detail: "Playwright launched a Chromium browser instance.",
        timestamp: startedAt.toISOString(),
      },
    });

    if (hasSession(storageState)) {
      const traceNote = {
        label: "Trace capture disabled",
        detail:
          "This run uses a stored session. Playwright traces record request headers and artifacts are served publicly, so traces are not captured for authenticated runs.",
        timestamp: new Date().toISOString(),
      };
      trail.push(createTrailStep(traceNote));
      await appendRunTrailStep({ runId, step: traceNote });
    }

    while (queue.pending.length > 0) {
      const next = takeNextCrawlPage(queue);
      queue = next.state;

      if (!next.page) break;

      const { pageResult, discoveredLinks } = await inspectRoute({
        browser,
        route: next.page,
        runId,
        dnsCache,
        storageState,
      });
      pageResults.push(pageResult);
      let createdPageId: string | null = null;
      try {
        const createdPage = await prisma.pageResult.create({
          data: pageResultToCreateInput(pageResult, runId),
        });
        createdPageId = createdPage.id;
      } catch (pageResultError) {
        console.warn(
          `PageResult persistence failed for page ${pageResult.url} in run ${runId}: ${getErrorMessage(pageResultError, "Unknown error")}. Continuing crawl.`,
        );
      }

      if (createdPageId) {
        try {
          await persistPageEvidence({
            runId,
            pageResult,
            pageResultId: createdPageId,
            prisma,
          });
        } catch (evidenceError) {
          console.warn(
            `Evidence persistence failed for page ${pageResult.url} in run ${runId}: ${getErrorMessage(evidenceError, "Unknown error")}. Continuing crawl.`,
          );
        }
      }

      const stepInput = {
        label: `Inspected page (Depth ${pageResult.depth})`,
        detail: `Evaluated ${formatDisplayUrl(pageResult.url)} with status ${pageResult.status}${
          pageResult.statusCode ? ` (${pageResult.statusCode})` : ""
        }.`,
        timestamp: pageResult.updatedAt,
      };
      trail.push(createTrailStep(stepInput));
      try {
        await appendRunTrailStep({ runId, step: stepInput });
      } catch (trailErr) {
        console.warn(
          `Failed to append trail step for run ${runId}: ${getErrorMessage(trailErr, "Unknown error")}`,
        );
      }
      if (mode === "crawl" && pageResult.status === "Completed") {
        queue = enqueueCrawlLinks({
          state: queue,
          originUrl: startingPage.url,
          parent: next.page,
          links: discoveredLinks,
          options,
        });

        if (discoveredLinks.length > 0) {
          const discoveryStep = {
            label: "Discovered crawl links",
            detail: `Found ${discoveredLinks.length} candidate link(s) on ${formatDisplayUrl(pageResult.url)}.`,
            timestamp: new Date().toISOString(),
          };
          trail.push(createTrailStep(discoveryStep));
          await appendRunTrailStep({ runId, step: discoveryStep });
        }
      }
    }

    const finishedAt = new Date();
    const failedPageCount = pageResults.filter(
      (pageResult) => pageResult.status === "Failed",
    ).length;
    const { status, summary } = getTerminalRunOutcome({
      totalPages: pageResults.length,
      failedPages: failedPageCount,
    });

    trail.push(
      createTerminalRunTrailStep({
        status,
        summary,
        timestamp: finishedAt.toISOString(),
      }),
    );

    return {
      id: runId,
      status,
      createdAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      pageResults,
      summary,
      trail,
    };
  } finally {
    if (browser) {
      activeBrowsers.delete(browser);
      await browser.close().catch(() => {});
    }
  }
}

async function inspectRoute({
  browser,
  route,
  runId,
  dnsCache,
  storageState,
}: {
  browser: Browser;
  route: { url: string; depth: number };
  runId: string;
  dnsCache: Map<string, boolean>;
  storageState?: StorageState;
}): Promise<{ pageResult: PageResult; discoveredLinks: string[] }> {
  const pageId = randomUUID();
  const startedAt = new Date();
  const collector = createBrowserEvidenceCollector();
  let context: BrowserContext | undefined;
  let desktopPage: Page | undefined;
  let mobilePage: Page | undefined;

  try {
    context = await browser.newContext(
      hasSession(storageState) ? { storageState } : undefined,
    );
    try {
      // Traces record request headers and public/artifacts is served statically,
      // so tracing an authenticated session would publish its cookies.
      if (!hasSession(storageState)) {
        await context.tracing.start({ screenshots: true, snapshots: true, sources: false });
      }
    } catch (traceErr) {
      console.warn(`Failed to start Playwright tracing for page ${route.url} in run ${runId}:`, traceErr);
    }

    desktopPage = await context.newPage();
    await desktopPage.addInitScript(VITALS_INIT_SCRIPT);
    await desktopPage.setViewportSize({ width: 1440, height: 900 });
    mobilePage = await context.newPage();
    await mobilePage.setViewportSize({ width: 390, height: 844 });
    await desktopPage.route("**/*", (playwrightRoute, request) =>
      handleRoute(playwrightRoute, request, dnsCache),
    );
    await mobilePage.route("**/*", (playwrightRoute, request) =>
      handleRoute(playwrightRoute, request, dnsCache),
    );

    attachPageEvidenceListeners({
      page: desktopPage,
      viewportLabel: "Desktop",
      collector,
    });
    attachPageEvidenceListeners({
      page: mobilePage,
      viewportLabel: "Mobile",
      collector,
    });

    const desktopResponse = await desktopPage.goto(route.url, {
      waitUntil: "domcontentloaded",
      timeout: PAGE_GOTO_TIMEOUT_MS,
    });
    await mobilePage.goto(route.url, {
      waitUntil: "domcontentloaded",
      timeout: PAGE_GOTO_TIMEOUT_MS,
    });

    await waitForPageToSettle(desktopPage);
    await waitForPageToSettle(mobilePage);

    const rawCookies = await context.cookies().catch(() => []);
    const cookies = rawCookies.map((c) => ({
      name: c.name,
      secure: c.secure,
      httpOnly: c.httpOnly,
      sameSite: c.sameSite,
    }));

    let a11yViolations: A11yViolation[] = [];
    try {
      const axeResults = await new AxeBuilder({ page: desktopPage })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .disableRules(["color-contrast"])
        .analyze();

      a11yViolations = axeResults.violations.map((v) => ({
        id: v.id,
        impact: v.impact ?? "minor",
        description: v.description,
        help: v.help,
        helpUrl: v.helpUrl,
        nodes: v.nodes.map((n) => ({
          target: n.target.map((t) => (typeof t === "string" ? t : JSON.stringify(t))),
          html: n.html,
          failureSummary: n.failureSummary,
        })),
      }));
    } catch (axeErr) {
      console.warn(
        `[Helios] Accessibility audit skipped for ${route.url}:`,
        axeErr instanceof Error ? axeErr.message : axeErr,
      );
    }

    const { title, finalUrl, description, loadMetrics } =
      await capturePageMetadata(desktopPage);
    const brokenImages = await captureBrokenImages(desktopPage);
    const artifacts = await captureRunScreenshots({
      runId,
      pageId,
      desktopPage,
      mobilePage,
    });

    if (context && !hasSession(storageState)) {
      try {
        const traceUrl = await saveRunTrace({ context, runId, pageId });
        if (traceUrl) {
          artifacts.trace = traceUrl;
        }
      } catch (traceErr) {
        console.warn(`Failed to save trace for page ${route.url} in run ${runId}:`, traceErr);
      }
    }
    const discoveredLinks = extractLinks(
      await desktopPage.content(),
      finalUrl,
    );
    const finishedAt = new Date();
    const statusCode = desktopResponse?.status();
    const botChallenge = detectBotChallenge(desktopResponse?.headers());
    const loginRedirect = isLoginRedirect(route.url, finalUrl);
    const authExpired = hasSession(storageState) && loginRedirect;
    const pageFailed =
      derivePageStatus(statusCode) === "Failed" ||
      authExpired ||
      botChallenge !== undefined;

    return {
      pageResult: {
        id: pageId,
        url: route.url,
        depth: route.depth,
        status: pageFailed ? "Failed" : "Completed",
        statusCode,
        botChallenge,
        loginRedirect: authExpired,
        finalUrl,
        title,
        description,
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        artifacts,
        brokenImages,
        consoleErrors: collector.consoleErrors,
        failedRequests: collector.failedRequests,
        insecureResources: collector.insecureResources,
        cookies,
        securityHeaders: desktopResponse?.headers(),
        a11yViolations,
        loadMetrics,
        createdAt: startedAt.toISOString(),
        updatedAt: finishedAt.toISOString(),
      },
      discoveredLinks,
    };
  } catch (error) {
    const finishedAt = new Date();
    const message = getPlaywrightErrorMessage(error);

    return {
      pageResult: {
        id: pageId,
        url: route.url,
        depth: route.depth,
        status: "Failed",
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        consoleErrors: [...collector.consoleErrors, `[Helios] ${message}`],
        failedRequests: collector.failedRequests,
        createdAt: startedAt.toISOString(),
        updatedAt: finishedAt.toISOString(),
      },
      discoveredLinks: [],
    };
  } finally {
    await mobilePage?.close().catch(() => {});
    await desktopPage?.close().catch(() => {});
    await context?.close().catch(() => {});
  }
}
