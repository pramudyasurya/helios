import "server-only";
import type { Page } from "playwright";

import { PAGE_SETTLE_TIMEOUT_MS } from "@/lib/shared/domain/constants";

export async function waitForPageToSettle(page: Page): Promise<void> {
  try {
    await page.waitForLoadState("load", {
      timeout: PAGE_SETTLE_TIMEOUT_MS,
    });
  } catch {
    // Timeouts on slow or long-polling pages are expected; capture proceeds.
  }
}
