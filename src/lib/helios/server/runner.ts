import { chromium, type Route, type Request, type Browser } from "playwright";
import { lookup } from "node:dns/promises";

import type { CreateRunResponse } from "@/lib/helios/shared/types";

import { PAGE_GOTO_TIMEOUT_MS } from "@/lib/helios/shared/constants";

import { getPlaywrightErrorMessage } from "@/lib/helios/server/errors";
import { capturePageMetadata } from "@/lib/helios/server/metadata";
import {
  attachPageEvidenceListeners,
  captureBrokenImages,
  createBrowserEvidenceCollector,
} from "@/lib/helios/server/evidence";
import { captureRunScreenshots } from "@/lib/helios/server/artifacts";
import { waitForPageToSettle } from "@/lib/helios/server/navigation";
import { createTrailStep, getRunTimestamp } from "@/lib/helios/server/trail";
import { isIpPrivate } from "../shared/validators";

type RunSinglePageQAProps = {
  submittedUrl: string;
  runId: string;
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
