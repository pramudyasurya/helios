import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { chromium, type Browser, type Page } from "playwright";
import { executeJourney } from "./journey-executor";
import type { JourneyStep } from "@/lib/shared/domain/journey";

describe("journey-executor live Chromium E2E integration", () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
  });

  afterAll(async () => {
    if (browser) await browser.close();
  });

  it("executes multi-step user transactions on a real DOM page in Chromium", async () => {
    page = await browser.newPage();

    const htmlFixture = `
      <!DOCTYPE html>
      <html>
        <head><title>Helios Journey Test Fixture</title></head>
        <body style="font-family: sans-serif; padding: 20px;">
          <h1 id="welcome-title">Helios Portal</h1>
          <form id="auth-form" onsubmit="event.preventDefault(); document.getElementById('status-msg').textContent = 'Welcome, ' + document.getElementById('user-input').value + '!'; document.getElementById('portal-view').style.display = 'block';">
            <input type="text" id="user-input" placeholder="Username" />
            <select id="role-select">
              <option value="viewer">Viewer</option>
              <option value="admin">Administrator</option>
            </select>
            <button type="submit" id="submit-btn">Enter Portal</button>
          </form>
          <div id="status-msg"></div>
          <div id="portal-view" style="display: none; margin-top: 20px;">
            <h2>Dashboard Area</h2>
            <p>Access Granted</p>
          </div>
        </body>
      </html>
    `;

    await page.setContent(htmlFixture);

    const steps: JourneyStep[] = [
      { id: "step-1", action: "waitForSelector", selector: "#welcome-title" },
      { id: "step-2", action: "assertVisible", selector: "#welcome-title" },
      { id: "step-3", action: "assertText", selector: "#welcome-title", value: "Helios Portal" },
      { id: "step-4", action: "fill", selector: "#user-input", value: "Pram" },
      { id: "step-5", action: "select", selector: "#role-select", value: "admin" },
      { id: "step-6", action: "click", selector: "#submit-btn" },
      { id: "step-7", action: "waitForSelector", selector: "#portal-view" },
      { id: "step-8", action: "assertVisible", selector: "#portal-view" },
      { id: "step-9", action: "assertText", selector: "#status-msg", value: "Welcome, Pram!" },
    ];

    const result = await executeJourney(page, steps);

    expect(result.passed).toBe(true);
    expect(result.stepsTotal).toBe(9);
    expect(result.stepsPassed).toBe(9);
    expect(result.stepsFailed).toBe(0);
    expect(result.outcomes).toHaveLength(9);
    expect(result.outcomes.every((o) => o.status === "passed")).toBe(true);
    expect(result.outcomes.every((o) => o.durationMs >= 0)).toBe(true);

    await page.close();
  });

  it("handles assertion failures with realistic DOM assertions and step skipping", async () => {
    page = await browser.newPage();

    const htmlFixture = `
      <!DOCTYPE html>
      <html>
        <body>
          <h1 id="header">Wrong Header</h1>
          <button id="next-btn">Next</button>
        </body>
      </html>
    `;
    await page.setContent(htmlFixture);

    const steps: JourneyStep[] = [
      { id: "step-1", action: "assertVisible", selector: "#header" },
      { id: "step-2", action: "assertText", selector: "#header", value: "Expected Correct Header" },
      { id: "step-3", action: "click", selector: "#next-btn" },
    ];

    const result = await executeJourney(page, steps);

    expect(result.passed).toBe(false);
    expect(result.stepsPassed).toBe(1);
    expect(result.stepsFailed).toBe(1);
    expect(result.outcomes[0].status).toBe("passed");
    expect(result.outcomes[1].status).toBe("failed");
    expect(result.outcomes[1].error).toContain("Expected text 'Expected Correct Header' not found");
    expect(result.outcomes[2].status).toBe("skipped");

    await page.close();
  });
});
