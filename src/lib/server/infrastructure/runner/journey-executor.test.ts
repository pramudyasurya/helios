import { describe, expect, it, vi } from "vitest";
import type { Page } from "playwright";
import { executeJourney } from "./journey-executor";
import type { JourneyStep } from "@/lib/shared/domain/journey";

describe("journey-executor", () => {
  function createMockPage(overrides: Partial<Record<keyof Page, unknown>> = {}): Page {
    return {
      goto: vi.fn().mockResolvedValue(null),
      waitForSelector: vi.fn().mockResolvedValue(null),
      click: vi.fn().mockResolvedValue(null),
      fill: vi.fn().mockResolvedValue(null),
      selectOption: vi.fn().mockResolvedValue([]),
      press: vi.fn().mockResolvedValue(null),
      keyboard: {
        press: vi.fn().mockResolvedValue(null),
      },
      isVisible: vi.fn().mockResolvedValue(true),
      textContent: vi.fn().mockResolvedValue("Welcome to Helios"),
      url: vi.fn().mockReturnValue("https://example.com/dashboard"),
      ...overrides,
    } as unknown as Page;
  }

  it("executes a complete successful sequence of steps", async () => {
    const page = createMockPage();
    const steps: JourneyStep[] = [
      { id: "1", action: "goto", url: "https://example.com" },
      { id: "2", action: "fill", selector: "#username", value: "admin" },
      { id: "3", action: "click", selector: "button[type='submit']" },
      { id: "4", action: "waitForSelector", selector: "#dashboard" },
      { id: "5", action: "assertVisible", selector: "#dashboard" },
      { id: "6", action: "assertText", selector: "h1", value: "Welcome to Helios" },
      { id: "7", action: "assertUrl", value: "/dashboard" },
    ];

    const result = await executeJourney(page, steps);

    expect(result.passed).toBe(true);
    expect(result.stepsTotal).toBe(7);
    expect(result.stepsPassed).toBe(7);
    expect(result.stepsFailed).toBe(0);
    expect(result.outcomes).toHaveLength(7);
    expect(result.outcomes.every((o) => o.status === "passed")).toBe(true);
  });

  it("fails and marks subsequent required steps as skipped when an assertion fails", async () => {
    const page = createMockPage({
      textContent: vi.fn().mockResolvedValue("Incorrect Title"),
    });

    const steps: JourneyStep[] = [
      { id: "1", action: "goto", url: "https://example.com" },
      { id: "2", action: "assertText", selector: "h1", value: "Expected Title" },
      { id: "3", action: "click", selector: "#proceed" },
    ];

    const result = await executeJourney(page, steps);

    expect(result.passed).toBe(false);
    expect(result.stepsTotal).toBe(3);
    expect(result.stepsPassed).toBe(1);
    expect(result.stepsFailed).toBe(1);
    expect(result.error).toContain("Expected text 'Expected Title' not found");
    expect(result.outcomes[1].status).toBe("failed");
    expect(result.outcomes[2].status).toBe("skipped");
  });

  it("continues execution when an optional step fails", async () => {
    const page = createMockPage({
      waitForSelector: vi.fn().mockImplementation((selector: string) => {
        if (selector === "#optional-promo") {
          throw new Error("Timeout waiting for selector");
        }
        return Promise.resolve(null);
      }),
    });

    const steps: JourneyStep[] = [
      { id: "1", action: "goto", url: "https://example.com" },
      { id: "2", action: "click", selector: "#optional-promo", optional: true },
      { id: "3", action: "assertUrl", value: "example.com" },
    ];

    const result = await executeJourney(page, steps);

    expect(result.passed).toBe(true);
    expect(result.stepsPassed).toBe(2);
    expect(result.stepsFailed).toBe(1);
    expect(result.outcomes[1].status).toBe("failed");
    expect(result.outcomes[2].status).toBe("passed");
  });

  it("blocks non-HTTP protocols in goto step", async () => {
    const page = createMockPage();
    const steps: JourneyStep[] = [
      { id: "1", action: "goto", url: "file:///etc/passwd" },
    ];

    const result = await executeJourney(page, steps);

    expect(result.passed).toBe(false);
    expect(result.error).toContain("Unsupported protocol file:");
  });
});
