import "server-only";
import type { Page } from "playwright";

export async function capturePageMetadata(page: Page) {
  const title = await page.title();
  const finalUrl = page.url();

  const description = await page.evaluate(() => {
    const selectors = [
      'meta[name="description"]',
      'meta[property="og:description"]',
      'meta[name="twitter:description"]',
    ];

    for (const selector of selectors) {
      const content = document
        .querySelector(selector)
        ?.getAttribute("content")
        ?.trim();

      if (content) return content;
    }

    return undefined;
  });

  const loadMetrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;

    if (!navigation) return undefined;

    return {
      domContentLoadedMs: Math.round(navigation.domContentLoadedEventEnd),
      loadEventMs: Math.round(navigation.loadEventEnd),
    };
  });

  return {
    title,
    finalUrl,
    description: description ?? undefined,
    loadMetrics,
  };
}
