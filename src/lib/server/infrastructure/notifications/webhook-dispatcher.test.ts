import { describe, it, expect, vi } from "vitest";
import { dispatchRunAlerts } from "./webhook-dispatcher";
import type { LatestRun } from "@/lib/shared/domain/types";
import type { WebhookConfig } from "@/lib/shared/domain/notifications";

function makeRun(status: "Completed" | "Failed"): LatestRun {
  return {
    id: "run-test-123",
    startingUrl: "https://example.com",
    status,
    trail: [],
    summary: status === "Failed" ? "1 check failed" : "All checks passed",
    createdAt: new Date().toISOString(),
    durationMs: 1250,
    checks: [
      {
        title: "Page load",
        detail: "Loaded in 200ms",
        status: "passed",
        severity: "info",
      },
      ...(status === "Failed"
        ? [
            {
              title: "Console errors",
              detail: "Uncaught TypeError",
              status: "failed" as const,
              severity: "high" as const,
            },
          ]
        : []),
    ],
    loadMetrics: {
      domContentLoadedMs: 300,
      loadEventMs: 500,
      lcpMs: 850,
      cls: 0.02,
      ttfbMs: 120,
    },
  };
}

describe("webhook-dispatcher", () => {
  it("filters out on_failure webhooks when run succeeds", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("OK", { status: 200 }));
    const webhooks: WebhookConfig[] = [
      {
        id: "w1",
        url: "https://discord.com/api/webhooks/test",
        provider: "discord",
        triggers: ["on_failure"],
        enabled: true,
      },
    ];

    const results = await dispatchRunAlerts(makeRun("Completed"), webhooks, {
      fetchImpl: fetchMock,
    });

    expect(results).toHaveLength(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("dispatches to Discord with embeds when run fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("OK", { status: 200 }));
    const webhooks: WebhookConfig[] = [
      {
        id: "w-discord",
        url: "https://discord.com/api/webhooks/123",
        provider: "discord",
        triggers: ["on_failure"],
        enabled: true,
      },
    ];

    const results = await dispatchRunAlerts(makeRun("Failed"), webhooks, {
      fetchImpl: fetchMock,
    });

    expect(results).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [calledUrl, calledInit] = fetchMock.mock.calls[0];
    expect(calledUrl).toBe("https://discord.com/api/webhooks/123");
    const parsedBody = JSON.parse(calledInit.body);
    expect(parsedBody.embeds).toBeDefined();
    expect(parsedBody.embeds[0].color).toBe(0xf43f5e);
  });

  it("dispatches to Slack with Block Kit blocks", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("OK", { status: 200 }));
    const webhooks: WebhookConfig[] = [
      {
        id: "w-slack",
        url: "https://hooks.slack.com/services/123",
        provider: "slack",
        triggers: ["on_every_run"],
        enabled: true,
      },
    ];

    await dispatchRunAlerts(makeRun("Completed"), webhooks, {
      fetchImpl: fetchMock,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, calledInit] = fetchMock.mock.calls[0];
    const parsedBody = JSON.parse(calledInit.body);
    expect(parsedBody.blocks).toBeDefined();
    expect(parsedBody.blocks.length).toBeGreaterThan(0);
  });

  it("signs generic webhook payloads with HMAC-SHA256 when secret is provided", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("OK", { status: 200 }));
    const webhooks: WebhookConfig[] = [
      {
        id: "w-generic",
        url: "https://api.mycompany.com/webhook",
        provider: "generic",
        triggers: ["on_every_run"],
        secret: "super-secret-key",
        enabled: true,
      },
    ];

    await dispatchRunAlerts(makeRun("Completed"), webhooks, {
      fetchImpl: fetchMock,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, calledInit] = fetchMock.mock.calls[0];
    expect(calledInit.headers["X-Helios-Event"]).toBe("run.completed");
    expect(calledInit.headers["X-Helios-Signature"]).toMatch(/^sha256=[a-f0-9]{64}$/);
  });
});
