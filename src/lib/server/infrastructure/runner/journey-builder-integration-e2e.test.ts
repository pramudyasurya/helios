import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { chromium, type Browser, type Page } from "playwright";
import { executeJourney } from "./journey-executor";
import type { JourneyStep } from "@/lib/shared/domain/journey";

describe("journey-step-builder & executor end-to-end integration", () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
  });

  afterAll(async () => {
    if (browser) await browser.close();
  });

  it("executes an interactive multi-action journey created from builder DSL", async () => {
    page = await browser.newPage();

    const testAppHtml = `
      <!DOCTYPE html>
      <html>
        <head><title>Helios E2E Checkout Flow</title></head>
        <body style="padding: 20px; font-family: monospace;">
          <h2 id="app-heading">Checkout Demo</h2>
          <div id="cart-section">
            <label for="item-qty">Quantity:</label>
            <input type="text" id="item-qty" value="1" />
            <select id="shipping-method">
              <option value="standard">Standard (5-7 days)</option>
              <option value="express">Express (Next day)</option>
            </select>
            <button id="checkout-btn" onclick="document.getElementById('confirmation').style.display = 'block'; document.getElementById('order-status').textContent = 'Order Placed: Express';">Proceed</button>
          </div>
          <div id="confirmation" style="display: none; margin-top: 15px;">
            <h3>Success</h3>
            <span id="order-status">Pending</span>
          </div>
        </body>
      </html>
    `;

    await page.setContent(testAppHtml);

    // Steps matching what JourneyStepBuilder generates
    const steps: JourneyStep[] = [
      { id: "1", action: "waitForSelector", selector: "#app-heading" },
      { id: "2", action: "assertVisible", selector: "#app-heading" },
      { id: "3", action: "fill", selector: "#item-qty", value: "3" },
      { id: "4", action: "select", selector: "#shipping-method", value: "express" },
      { id: "5", action: "click", selector: "#checkout-btn" },
      { id: "6", action: "waitForSelector", selector: "#confirmation" },
      { id: "7", action: "assertVisible", selector: "#confirmation" },
      { id: "8", action: "assertText", selector: "#order-status", value: "Order Placed: Express" },
    ];

    const result = await executeJourney(page, steps);

    expect(result.passed).toBe(true);
    expect(result.stepsTotal).toBe(8);
    expect(result.stepsPassed).toBe(8);
    expect(result.stepsFailed).toBe(0);
    expect(result.outcomes).toHaveLength(8);

    await page.close();
  });
});
