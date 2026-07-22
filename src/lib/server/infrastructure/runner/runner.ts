import "server-only";
import { chromium, type Route, type Request, type Browser, type Page } from "playwright";
import { lookup } from "node:dns/promises";
import { randomUUID } from "node:crypto";

import type {
  CreateRunResponse,
  PageResult,
} from "@/lib/shared/domain/types";

import { PAGE_GOTO_TIMEOUT_MS } from "@/lib/shared/domain/constants";

import { getPlaywrightErrorMessage } from "@/lib/server/infrastructure/runner/errors";
import { capturePageMetadata } from "@/lib/server/infrastructure/runner/metadata";
import {
  attachPageEvidenceListeners,
  captureBrokenImages,
  createBrowserEvidenceCollector,
} from "@/lib/server/infrastructure/runner/evidence";
import { captureRunScreenshots } from "@/lib/server/infrastructure/runner/artifacts";
import { waitForPageToSettle } from "@/lib/server/infrastructure/runner/navigation";
import { createTrailStep, getRunTimestamp } from "@/lib/server/infrastructure/runner/trail";
import { isIpPrivate } from "@/lib/shared/domain/validators";
import {
  createCrawlQueue,
  enqueueCrawlLinks,
  extractLinks,
  takeNextCrawlPage,
  type CrawlOptions,
} from "@/lib/server/infrastructure/runner/crawler";
import { prisma } from "@/lib/server/infrastructure/db/prisma";

type RunSinglePageQAProps = {
  submittedUrl: string;
  runId: string;
};

export type RunMode = "single" | "manual" | "crawl";

export type RunMultiRouteQAProps = {
  submittedUrl: string;
  runId: string;
  mode: RunMode;
  routes?: string[];
  maxPages?: number;
  maxDepth?: number;
};

export type MultiRouteRunResult = {
  id: string;
  status: "Completed" | "Failed";
  createdAt: string;
  finishedAt: string;
  durationMs: number;
  pageResults: PageResult[];
  summary: string;
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

export async function runSinglePageQA({
  submittedUrl,
  runId,
}: RunSinglePageQAProps): Promise<CreateRunResponse> {
  const startedAt = new Date();
  const dnsCache = new Map<string, boolean>();

  let browser: Browser | undefined;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage({
      viewport: {
        width: 1440,
        height: 900,
      },
    });

    const mobilePage = await browser.newPage({
      viewport: {
        width: 390,
        height: 844,
      },
      isMobile: true,
    });

    await page.route("**/*", (route, request) =>
      handleRoute(route, request, dnsCache),
    );
    await mobilePage.route("**/*", (route, request) =>
      handleRoute(route, request, dnsCache),
    );

    const evidenceCollector = createBrowserEvidenceCollector();

    attachPageEvidenceListeners({
      page,
      viewportLabel: "Desktop",
      collector: evidenceCollector,
    });

    attachPageEvidenceListeners({
      page: mobilePage,
      viewportLabel: "Mobile",
      collector: evidenceCollector,
    });

    await page.goto(submittedUrl, {
      waitUntil: "domcontentloaded",
      timeout: PAGE_GOTO_TIMEOUT_MS,
    });

    await mobilePage.goto(submittedUrl, {
      waitUntil: "domcontentloaded",
      timeout: PAGE_GOTO_TIMEOUT_MS,
    });

    const desktopSettled = await waitForPageToSettle(page);
    const mobileSettled = await waitForPageToSettle(mobilePage);

    const { title, finalUrl, description, loadMetrics } =
      await capturePageMetadata(page);

    const brokenImages = await captureBrokenImages(page);

    const artifacts = await captureRunScreenshots({
      runId,
      desktopPage: page,
      mobilePage,
    });

    const finishedAt = new Date();
    const durationMs = finishedAt.getTime() - startedAt.getTime();
    const { consoleErrors, failedRequests } = evidenceCollector;

    return {
      id: runId,
      startingUrl: submittedUrl,
      finalUrl,
      status: "Completed",
      title,
      description,
      createdAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs,
      loadMetrics,
      summary:
        "Helios opened the submitted URL with Playwright and captured basic page metadata.",
      trail: [
        createTrailStep({
          label: "Request received",
          detail: "Helios accepted and validated the submitted URL",
          timestamp: startedAt.toISOString(),
        }),
        createTrailStep({
          label: "Browser launched",
          detail: "Playwright launched a Chromium browser instance.",
          timestamp: getRunTimestamp(startedAt, 250),
        }),
        createTrailStep({
          label: "Navigated to URL",
          detail: `Desktop and mobile pages navigated to ${submittedUrl}.`,
          timestamp: getRunTimestamp(startedAt, 750),
        }),
        createTrailStep({
          label: "Page settle check completed",
          detail:
            desktopSettled && mobileSettled
              ? "Desktop and mobile pages reached network idle."
              : "At least one viewport did not reach network idle before the settle timeout; Helios continued with available evidence.",
          timestamp: getRunTimestamp(startedAt, 1_500),
        }),
        createTrailStep({
          label: "Page metadata captured",
          detail: `Captured title and final URL: ${finalUrl}.`,
          timestamp: getRunTimestamp(startedAt, 2_000),
        }),
        createTrailStep({
          label: "Screenshots captured",
          detail:
            "Desktop and mobile screenshots were saved as local artifacts.",
          timestamp: getRunTimestamp(startedAt, 2_500),
        }),
        createTrailStep({
          label: "Console and network evidence collected",
          detail: `${consoleErrors.length} console error(s), ${failedRequests.length} failed request(s) captured.`,
          timestamp: getRunTimestamp(startedAt, 2_750),
        }),
        createTrailStep({
          label: "Run completed",
          detail: "Browser QA run completed successfully.",
          timestamp: finishedAt.toISOString(),
        }),
      ],
      artifacts,
      brokenImages,
      consoleErrors,
      failedRequests,
    };
  } catch (error) {
    throw new Error(getPlaywrightErrorMessage(error));
  } finally {
    await browser?.close();
  }
}

export async function isPrivateHostOrIp(
  hostOrIp: string,
  dnsCache?: Map<string, boolean>,
): Promise<boolean> {
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
  let browser: Browser | undefined;

  try {
    browser = await chromium.launch();

    while (queue.pending.length > 0) {
      const next = takeNextCrawlPage(queue);
      queue = next.state;

      if (!next.page) break;

      const { pageResult, discoveredLinks } = await inspectRoute({
        browser,
        route: next.page,
        runId,
        dnsCache,
      });
      pageResults.push(pageResult);

      if (mode === "crawl" && pageResult.status === "Completed") {
        queue = enqueueCrawlLinks({
          state: queue,
          originUrl: startingPage.url,
          parent: next.page,
          links: discoveredLinks,
          options,
        });
      }
    }

    await prisma.pageResult.createMany({
      data: pageResults.map((pageResult) => ({
        id: pageResult.id,
        runId,
        url: pageResult.url,
        depth: pageResult.depth,
        status: pageResult.status,
        statusCode: pageResult.statusCode,
        finalUrl: pageResult.finalUrl,
        title: pageResult.title,
        description: pageResult.description,
        durationMs: pageResult.durationMs,
        artifacts: pageResult.artifacts,
        brokenImages: pageResult.brokenImages,
        consoleErrors: pageResult.consoleErrors,
        failedRequests: pageResult.failedRequests,
        loadMetrics: pageResult.loadMetrics,
        createdAt: new Date(pageResult.createdAt),
        updatedAt: new Date(pageResult.updatedAt),
      })),
    });

    const finishedAt = new Date();
    const failedPageCount = pageResults.filter(
      (pageResult) => pageResult.status === "Failed",
    ).length;

    return {
      id: runId,
      status: failedPageCount === pageResults.length ? "Failed" : "Completed",
      createdAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      pageResults,
      summary:
        failedPageCount === 0
          ? `Helios completed QA for ${pageResults.length} page(s).`
          : `Helios completed QA for ${pageResults.length} page(s) with ${failedPageCount} failed page(s).`,
    };
  } finally {
    await browser?.close();
  }
}

async function inspectRoute({
  browser,
  route,
  runId,
  dnsCache,
}: {
  browser: Browser;
  route: { url: string; depth: number };
  runId: string;
  dnsCache: Map<string, boolean>;
}): Promise<{ pageResult: PageResult; discoveredLinks: string[] }> {
  const pageId = randomUUID();
  const startedAt = new Date();
  const collector = createBrowserEvidenceCollector();
  let desktopPage: Page | undefined;
  let mobilePage: Page | undefined;

  try {
    desktopPage = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    mobilePage = await browser.newPage({
      viewport: { width: 390, height: 844 },
      isMobile: true,
    });

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

    const { title, finalUrl, description, loadMetrics } =
      await capturePageMetadata(desktopPage);
    const brokenImages = await captureBrokenImages(desktopPage);
    const artifacts = await captureRunScreenshots({
      runId,
      pageId,
      desktopPage,
      mobilePage,
    });
    const discoveredLinks = extractLinks(
      await desktopPage.content(),
      finalUrl,
    );
    const finishedAt = new Date();

    return {
      pageResult: {
        id: pageId,
        url: route.url,
        depth: route.depth,
        status: "Completed",
        statusCode: desktopResponse?.status(),
        finalUrl,
        title,
        description,
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        artifacts,
        brokenImages,
        consoleErrors: collector.consoleErrors,
        failedRequests: collector.failedRequests,
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
    await desktopPage?.close();
    await mobilePage?.close();
  }
}
