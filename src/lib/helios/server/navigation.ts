import type { Page } from "playwright";

import { PAGE_SETTLE_TIMEOUT_MS } from "@/lib/helios/shared/constants";

export async function waitForPageToSettle(page: Page) {
  try {
    await page.waitForLoadState("networkidle", {
      timeout: PAGE_SETTLE_TIMEOUT_MS,
    });
    return true;
  } catch {
    return false;
  }
}
