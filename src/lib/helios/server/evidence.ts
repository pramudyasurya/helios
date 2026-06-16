import type { Page } from "playwright";

type BrowserEvidenceCollector = {
  consoleErrors: string[];
  failedRequests: string[];
};

export async function captureBrokenImages(page: Page) {
  return page.evaluate(() => {
    return Array.from(document.images)
      .filter((image) => !image.complete || image.naturalWidth === 0)
      .map((image) => image.currentSrc || image.src)
      .filter(Boolean);
  });
}

export function createBrowserEvidenceCollector(): BrowserEvidenceCollector {
  return {
    consoleErrors: [],
    failedRequests: [],
  };
}

export function attachPageEvidenceListeners({
  page,
  viewportLabel,
  collector,
}: {
  page: Page;
  viewportLabel: string;
  collector: BrowserEvidenceCollector;
}) {
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      collector.consoleErrors.push(`[${viewportLabel}] ${msg.text()}`);
    }
  });

  page.on("requestfailed", (request) => {
    collector.failedRequests.push(
      `[${viewportLabel}] ${request.url()} - ${
        request.failure()?.errorText ?? "Unknown failure"
      }`,
    );
  });
}
