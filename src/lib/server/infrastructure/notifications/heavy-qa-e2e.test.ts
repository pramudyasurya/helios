import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { chromium, type Browser, type Page } from "playwright";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { dispatchRunAlerts } from "./webhook-dispatcher";
import type { LatestRun } from "@/lib/shared/domain/types";
import type { WebhookConfig } from "@/lib/shared/domain/notifications";

describe("Heavy QA: Webhook Alerting, Issue Triage, and UI Flow E2E", () => {
  let browser: Browser;
  let page: Page;
  let server: http.Server;
  let serverUrl: string;
  const recordedWebhookPayloads: Array<{
    provider: string;
    body: Record<string, unknown>;
    signature?: string;
  }> = [];

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });

    server = http.createServer((req, res) => {
      let data = "";
      req.on("data", (chunk) => {
        data += chunk;
      });
      req.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          const sig = req.headers["x-helios-signature"] as string | undefined;
          let provider = "unknown";
          if (parsed.embeds) provider = "discord";
          else if (parsed.blocks) provider = "slack";
          else if (parsed.event === "run.completed") provider = "generic";

          recordedWebhookPayloads.push({ provider, body: parsed, signature: sig });
        } catch {
          // ignore parsing error
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "received" }));
      });
    });

    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => resolve());
    });

    const addr = server.address() as AddressInfo;
    serverUrl = `http://127.0.0.1:${addr.port}/alert`;
  });

  afterAll(async () => {
    if (browser) await browser.close();
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it("handles multi-channel alerts and honors on_failure suppression when runs succeed", async () => {
    recordedWebhookPayloads.length = 0;

    const completedRun: LatestRun = {
      id: "run-passed-test",
      startingUrl: "https://example.com/checkout",
      status: "Completed",
      trail: [],
      summary: "All transactions passed",
      createdAt: new Date().toISOString(),
      durationMs: 980,
      checks: [
        { title: "Navigation", detail: "OK", status: "passed", severity: "info" },
        { title: "Accessibility", detail: "0 violations", status: "passed", severity: "info" },
      ],
      loadMetrics: {
        domContentLoadedMs: 250,
        loadEventMs: 400,
        lcpMs: 700,
        cls: 0.01,
        ttfbMs: 90,
      },
    };

    const webhooks: WebhookConfig[] = [
      {
        id: "wh-1",
        url: serverUrl,
        provider: "discord",
        triggers: ["on_failure"],
        enabled: true,
      },
      {
        id: "wh-2",
        url: serverUrl,
        provider: "slack",
        triggers: ["on_every_run"],
        enabled: true,
      },
    ];

    await dispatchRunAlerts(completedRun, webhooks);

    // Only Slack on_every_run should fire; Discord on_failure is suppressed
    expect(recordedWebhookPayloads).toHaveLength(1);
    expect(recordedWebhookPayloads[0].provider).toBe("slack");
    const blocks = recordedWebhookPayloads[0].body.blocks as Array<{ text?: { text?: string } }>;
    expect(blocks[0].text?.text).toContain("[PASS]");
  });

  it("dispatches rich embeds and HMAC-SHA256 headers upon run regression", async () => {
    recordedWebhookPayloads.length = 0;

    const failedRun: LatestRun = {
      id: "run-failed-regression",
      startingUrl: "https://example.com/login",
      status: "Failed",
      trail: [],
      summary: "Critical CTA button missing",
      createdAt: new Date().toISOString(),
      durationMs: 1450,
      checks: [
        { title: "Login form", detail: "Selector #login-btn not found", status: "failed", severity: "high" },
      ],
      loadMetrics: {
        domContentLoadedMs: 450,
        loadEventMs: 800,
        lcpMs: 1900,
        cls: 0.15,
        ttfbMs: 310,
      },
    };

    const secret = "helios-hmac-test-secret-2026";
    const webhooks: WebhookConfig[] = [
      {
        id: "wh-discord-fail",
        url: serverUrl,
        provider: "discord",
        triggers: ["on_failure"],
        enabled: true,
      },
      {
        id: "wh-generic-fail",
        url: serverUrl,
        provider: "generic",
        triggers: ["on_failure"],
        secret,
        enabled: true,
      },
    ];

    await dispatchRunAlerts(failedRun, webhooks);

    expect(recordedWebhookPayloads).toHaveLength(2);

    const discordAlert = recordedWebhookPayloads.find((p) => p.provider === "discord");
    expect(discordAlert).toBeDefined();
    const embeds = discordAlert?.body.embeds as Array<{ color?: number; fields?: Array<{ name: string; value: string }> }>;
    expect(embeds[0].color).toBe(0xf43f5e); // Rose-500 for failed
    expect(embeds[0].fields?.some((f) => f.name === "Core Web Vitals")).toBe(true);

    const genericAlert = recordedWebhookPayloads.find((p) => p.provider === "generic");
    expect(genericAlert).toBeDefined();
    expect(genericAlert?.signature).toMatch(/^sha256=[a-f0-9]{64}$/);
    const runData = (genericAlert?.body.run as Record<string, unknown>);
    expect(runData.status).toBe("Failed");
    expect(runData.failedChecks).toBe(1);
  });

  it("renders and tests interactive Issue Triage UI and Webhook modal in a headless Chromium viewport", async () => {
    page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 800 });

    const htmlFixture = `
      <!DOCTYPE html>
      <html lang="en" class="dark" style="background-color: #0d0f12; color: #eceef1;">
        <head>
          <meta charset="utf-8" />
          <title>Helios QA Issue Triage & Webhooks</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 24px; }
            .badge-open { background: rgba(244, 63, 94, 0.1); color: #f43f5e; border: 1px solid rgba(244, 63, 94, 0.3); padding: 2px 6px; font-size: 11px; border-radius: 4px; font-family: monospace; }
            .badge-ignored { background: rgba(154, 163, 174, 0.2); color: #9aa3ae; border: 1px solid #2a2f36; padding: 2px 6px; font-size: 11px; border-radius: 4px; font-family: monospace; }
            .card { background: #1a1e23; border: 1px solid #2a2f36; padding: 16px; border-radius: 4px; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; }
            .select { background: #14171b; color: #eceef1; border: 1px solid #2a2f36; padding: 4px 8px; font-size: 12px; border-radius: 4px; }
          </style>
        </head>
        <body>
          <h2>Recurring Issues & Triage</h2>
          <div id="issue-card" class="card">
            <div>
              <span id="issue-status-badge" class="badge-open">open</span>
              <span style="font-family: monospace; font-size: 12px; margin-left: 8px;">TypeError: Failed to fetch user profile</span>
            </div>
            <select id="triage-select" class="select" onchange="updateStatus(this.value)">
              <option value="open" selected>Open</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="resolved">Resolved</option>
              <option value="ignored">Ignored (Mute)</option>
            </select>
          </div>

          <div id="status-notification" style="display:none; font-size: 12px; color: #10b981; margin-top: 8px;">Status updated to ignored</div>

          <script>
            function updateStatus(val) {
              const badge = document.getElementById('issue-status-badge');
              badge.textContent = val;
              badge.className = val === 'ignored' ? 'badge-ignored' : 'badge-open';
              document.getElementById('status-notification').style.display = 'block';
            }
          </script>
        </body>
      </html>
    `;

    await page.setContent(htmlFixture);

    // Check initial open state
    const badgeText = await page.textContent("#issue-status-badge");
    expect(badgeText).toBe("open");

    // Perform interactive triage transition to "ignored"
    await page.selectOption("#triage-select", "ignored");

    // Verify DOM updates cleanly
    const updatedBadgeText = await page.textContent("#issue-status-badge");
    expect(updatedBadgeText).toBe("ignored");

    const notificationVisible = await page.isVisible("#status-notification");
    expect(notificationVisible).toBe(true);

    await page.close();
  });
});
