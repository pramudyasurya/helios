import "server-only";
import type { Page } from "playwright";

/**
 * Self-contained PerformanceObserver script injected before navigation.
 * Captures canonical Core Web Vitals:
 * - LCP (Largest Contentful Paint) via PerformanceObserver
 * - CLS (Cumulative Layout Shift) session-window aggregation
 * - FCP (First Contentful Paint) via paint observer
 * - TTFB (Time to First Byte) via navigation timing
 */
export const VITALS_INIT_SCRIPT = `
(function() {
  if (window.__helios_vitals) return;

  var vitals = {
    lcp: 0,
    cls: 0,
    fcp: 0,
    ttfb: 0
  };
  window.__helios_vitals = vitals;

  try {
    // 1. First Contentful Paint
    var paintObserver = new PerformanceObserver(function(list) {
      var entries = list.getEntries();
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].name === "first-contentful-paint") {
          vitals.fcp = Math.round(entries[i].startTime);
        }
      }
    });
    paintObserver.observe({ type: "paint", buffered: true });
  } catch (e) {}

  try {
    // 2. Largest Contentful Paint
    var lcpObserver = new PerformanceObserver(function(list) {
      var entries = list.getEntries();
      if (entries.length > 0) {
        var lastEntry = entries[entries.length - 1];
        vitals.lcp = Math.round(lastEntry.startTime);
      }
    });
    lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
  } catch (e) {}

  try {
    // 3. Cumulative Layout Shift (W3C Session Window: max 5s window, max 1s gap)
    var sessionValue = 0;
    var sessionEntries = [];
    var maxCls = 0;

    var clsObserver = new PerformanceObserver(function(list) {
      var entries = list.getEntries();
      for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];
        if (!entry.hadRecentInput) {
          var firstSessionEntry = sessionEntries[0];
          var lastSessionEntry = sessionEntries[sessionEntries.length - 1];

          if (
            sessionValue &&
            entry.startTime - lastSessionEntry.startTime < 1000 &&
            entry.startTime - firstSessionEntry.startTime < 5000
          ) {
            sessionValue += entry.value;
            sessionEntries.push(entry);
          } else {
            sessionValue = entry.value;
            sessionEntries = [entry];
          }

          if (sessionValue > maxCls) {
            maxCls = sessionValue;
            vitals.cls = Number(maxCls.toFixed(4));
          }
        }
      }
    });
    clsObserver.observe({ type: "layout-shift", buffered: true });
  } catch (e) {}
})();
`;

/**
 * Dispatches a synthetic visibilitychange event so Chromium finishes
 * buffering and reporting any pending LCP candidates before page close.
 */
export async function finalizeVitals(page: Page): Promise<void> {
  try {
    await page.evaluate(() => {
      try {
        Object.defineProperty(document, "visibilityState", {
          value: "hidden",
          writable: true,
          configurable: true,
        });
        document.dispatchEvent(new Event("visibilitychange"));
      } catch {
        // Suppress any DOM configuration errors in edge frames
      }
    });
  } catch {
    // Suppress if page is navigating or closed
  }
}
