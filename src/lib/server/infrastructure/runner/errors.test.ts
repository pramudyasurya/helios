import { describe, expect, it } from "vitest";
import { PAGE_GOTO_TIMEOUT_MS } from "@/lib/shared/domain/constants";
import { getPlaywrightErrorMessage } from "@/lib/server/infrastructure/runner/errors";

describe("getPlaywrightErrorMessage", () => {
  it("returns an unknown error message for non-Error values", () => {
    expect(getPlaywrightErrorMessage({})).toBe(
      "Playwright failed with an unknown error.",
    );
  });

  it("returns a timeout message when Playwright times out", () => {
    expect(getPlaywrightErrorMessage(new Error("Timeout"))).toBe(
      `Playwright timed out after ${PAGE_GOTO_TIMEOUT_MS / 1000}s while opening the submitted URL.`,
    );
  });

  it("returns a DNS-friendly message for unresolved domains", () => {
    const knownError = new Error("page.goto: net::ERR_NAME_NOT_RESOLVED");
    expect(getPlaywrightErrorMessage(knownError)).toBe(
      "The submitted domain could not be resolved. Check the URL or DNS configuration.",
    );
  });

  it("returns the original error message when no pattern matches", () => {
    expect(getPlaywrightErrorMessage(new Error("Something weird"))).toBe(
      "Something weird",
    );
  });
});
