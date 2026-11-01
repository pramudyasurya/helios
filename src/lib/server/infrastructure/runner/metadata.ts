import "server-only";
import type { Page } from "playwright";
import type { LoadMetrics, ResourceBudgets } from "@/lib/shared/domain/types";
import { finalizeVitals } from "@/lib/server/infrastructure/runner/vitals-script";
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

  await finalizeVitals(page);

  const loadMetrics = await page.evaluate((): LoadMetrics | undefined => {
    const navigation = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;

    if (!navigation) return undefined;

    const vitals = (window as unknown as {
      __helios_vitals?: {
        lcp: number;
        cls: number;
        fcp: number;
        ttfb: number;
      };
    }).__helios_vitals;

    const resourceEntries = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
    let jsBytes = 0;
    let cssBytes = 0;
    let imageBytes = 0;
    let fontBytes = 0;
    let totalTransferBytes = Math.round(navigation.transferSize || 0);

    for (const r of resourceEntries) {
      const bytes = Math.round(r.transferSize || r.decodedBodySize || 0);
      totalTransferBytes += bytes;

      const name = r.name.toLowerCase();
      const initiator = r.initiatorType;

      if (initiator === "script" || /\.m?js(\?|$)/i.test(name)) {
        jsBytes += bytes;
      } else if (initiator === "css" || initiator === "link" || /\.css(\?|$)/i.test(name)) {
        cssBytes += bytes;
      } else if (
        initiator === "img" ||
        initiator === "image" ||
        /\.(png|jpe?g|webp|gif|svg|avif|ico)(\?|$)/i.test(name)
      ) {
        imageBytes += bytes;
      } else if (initiator === "font" || /\.(woff2?|ttf|otf)(\?|$)/i.test(name)) {
        fontBytes += bytes;
      }
    }

    const resources: ResourceBudgets = {
      jsBytes,
      cssBytes,
      imageBytes,
      fontBytes,
      totalTransferBytes,
      resourceCount: resourceEntries.length,
    };

    const ttfb = Math.round(navigation.responseStart || 0);

    return {
      domContentLoadedMs: Math.round(navigation.domContentLoadedEventEnd),
      loadEventMs: Math.round(navigation.loadEventEnd),
      ttfbMs: ttfb > 0 ? ttfb : undefined,
      fcpMs: vitals?.fcp && vitals.fcp > 0 ? vitals.fcp : undefined,
      lcpMs: vitals?.lcp && vitals.lcp > 0 ? vitals.lcp : undefined,
      cls: vitals?.cls !== undefined ? vitals.cls : undefined,
      resources,
    };
  });

  return {
    title,
    finalUrl,
    description: description ?? undefined,
    loadMetrics,
  };
}
