import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { dispatchRunAlerts } from "./webhook-dispatcher";
import type { LatestRun } from "@/lib/shared/domain/types";
import type { WebhookConfig } from "@/lib/shared/domain/notifications";

describe("webhook-dispatcher live HTTP E2E integration", () => {
  let server: http.Server;
  let serverUrl: string;
  const receivedRequests: Array<{
    headers: http.IncomingHttpHeaders;
    body: Record<string, unknown>;
  }> = [];

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      let raw = "";
      req.on("data", (chunk) => {
        raw += chunk;
      });
      req.on("end", () => {
        try {
          receivedRequests.push({
            headers: req.headers,
            body: JSON.parse(raw),
          });
        } catch {
          receivedRequests.push({
            headers: req.headers,
            body: { raw },
          });
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      });
    });

    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => resolve());
    });

    const addr = server.address() as AddressInfo;
    serverUrl = `http://127.0.0.1:${addr.port}/webhook`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it("delivers live HTTP webhooks across all providers with correct wire payloads and signatures", async () => {
    receivedRequests.length = 0;

    const run: LatestRun = {
      id: "run-e2e-live",
      startingUrl: "https://example.com/checkout",
      status: "Failed",
      trail: [],
      summary: "Critical transaction check failed",
      createdAt: new Date().toISOString(),
      durationMs: 3420,
      checks: [
        {
          title: "Page load",
          detail: "Loaded in 410ms",
          status: "passed",
          severity: "info",
        },
        {
          title: "Checkout CTA",
          detail: "Button not clickable",
          status: "failed",
          severity: "high",
        },
      ],
      loadMetrics: {
        domContentLoadedMs: 400,
        loadEventMs: 650,
        lcpMs: 1200,
        cls: 0.04,
        ttfbMs: 180,
      },
    };

    const webhooks: WebhookConfig[] = [
      {
        id: "hook-discord",
        url: serverUrl,
        provider: "discord",
        triggers: ["on_failure"],
        enabled: true,
      },
      {
        id: "hook-slack",
        url: serverUrl,
        provider: "slack",
        triggers: ["on_failure"],
        enabled: true,
      },
      {
        id: "hook-generic",
        url: serverUrl,
        provider: "generic",
        triggers: ["on_failure"],
        secret: "test-secret-key-123",
        enabled: true,
      },
    ];

    const results = await dispatchRunAlerts(run, webhooks);
    expect(results).toHaveLength(3);
    expect(results.every((r) => r.status === "fulfilled")).toBe(true);

    expect(receivedRequests).toHaveLength(3);

    // 1. Discord embed validation
    const discordReq = receivedRequests.find((r) => Array.isArray(r.body.embeds));
    expect(discordReq).toBeDefined();
    const embeds = discordReq?.body.embeds as Array<Record<string, unknown>>;
    expect(embeds[0].color).toBe(0xf43f5e);
    expect(embeds[0].title).toBe("Helios QA Run: Failed");

    // 2. Slack Block Kit validation
    const slackReq = receivedRequests.find((r) => Array.isArray(r.body.blocks));
    expect(slackReq).toBeDefined();
    const blocks = slackReq?.body.blocks as Array<Record<string, unknown>>;
    expect(blocks[0].type).toBe("header");

    // 3. Generic HMAC signature validation
    const genericReq = receivedRequests.find((r) => r.body.event === "run.completed");
    expect(genericReq).toBeDefined();
    expect(genericReq?.headers["x-helios-event"]).toBe("run.completed");
    expect(genericReq?.headers["x-helios-signature"]).toMatch(/^sha256=[a-f0-9]{64}$/);
    const genericRun = (genericReq?.body as Record<string, unknown>).run as Record<string, unknown>;
    expect(genericRun.id).toBe("run-e2e-live");
    expect(genericRun.status).toBe("Failed");
    expect(genericRun.failedChecks).toBe(1);
    expect(genericRun.passedChecks).toBe(1);
  });
});
