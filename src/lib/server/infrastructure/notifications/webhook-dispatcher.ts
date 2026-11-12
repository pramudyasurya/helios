import crypto from "node:crypto";
import type { LatestRun } from "@/lib/shared/domain/types";
import type { WebhookConfig } from "@/lib/shared/domain/notifications";

export type DispatchAlertsOptions = {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

function formatDiscordPayload(run: LatestRun) {
  const isFailed = run.status === "Failed";
  const color = isFailed ? 0xf43f5e : 0x10b981; // Rose 500 : Emerald 500

  const passed = run.checks.filter((c) => c.status === "passed").length;
  const failed = run.checks.filter((c) => c.status === "failed").length;
  const warning = run.checks.filter((c) => c.status === "warning").length;

  const fields = [
    { name: "Target URL", value: run.startingUrl, inline: false },
    { name: "Status", value: run.status, inline: true },
    { name: "Duration", value: run.durationMs ? `${run.durationMs}ms` : "N/A", inline: true },
    {
      name: "Checks",
      value: `${passed} passed / ${failed} failed / ${warning} warning`,
      inline: false,
    },
  ];

  if (run.loadMetrics) {
    const lcp = run.loadMetrics.lcpMs != null ? `${Math.round(run.loadMetrics.lcpMs)}ms` : "N/A";
    const cls = run.loadMetrics.cls != null ? run.loadMetrics.cls.toFixed(3) : "N/A";
    const ttfb = run.loadMetrics.ttfbMs != null ? `${Math.round(run.loadMetrics.ttfbMs)}ms` : "N/A";
    fields.push({
      name: "Core Web Vitals",
      value: `LCP: ${lcp} | CLS: ${cls} | TTFB: ${ttfb}`,
      inline: false,
    });
  }

  return {
    embeds: [
      {
        title: `Helios QA Run: ${run.status}`,
        description: run.summary || "No summary provided",
        color,
        fields,
        footer: { text: `Run ID: ${run.id}` },
        timestamp: run.createdAt,
      },
    ],
  };
}

function formatSlackPayload(run: LatestRun) {
  const isFailed = run.status === "Failed";
  const icon = isFailed ? "[FAIL]" : "[PASS]";

  const passed = run.checks.filter((c) => c.status === "passed").length;
  const failed = run.checks.filter((c) => c.status === "failed").length;
  const warning = run.checks.filter((c) => c.status === "warning").length;

  const blocks: Array<Record<string, unknown>> = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `${icon} Helios QA Run ${run.status}`,
        emoji: false,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Target:* ${run.startingUrl}\n*Summary:* ${run.summary || "N/A"}\n*Duration:* ${run.durationMs ? `${run.durationMs}ms` : "N/A"}`,
      },
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Checks:*\n${passed} passed / ${failed} failed / ${warning} warning`,
        },
        {
          type: "mrkdwn",
          text: `*Run ID:*\n\`${run.id}\``,
        },
      ],
    },
  ];

  if (run.loadMetrics) {
    const lcp = run.loadMetrics.lcpMs != null ? `${Math.round(run.loadMetrics.lcpMs)}ms` : "N/A";
    const cls = run.loadMetrics.cls != null ? run.loadMetrics.cls.toFixed(3) : "N/A";
    const ttfb = run.loadMetrics.ttfbMs != null ? `${Math.round(run.loadMetrics.ttfbMs)}ms` : "N/A";
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Core Web Vitals:* LCP: \`${lcp}\` | CLS: \`${cls}\` | TTFB: \`${ttfb}\``,
      },
    });
  }

  return { blocks };
}

function formatGenericPayload(run: LatestRun) {
  const passed = run.checks.filter((c) => c.status === "passed").length;
  const failed = run.checks.filter((c) => c.status === "failed").length;
  const warning = run.checks.filter((c) => c.status === "warning").length;

  return {
    event: "run.completed",
    timestamp: new Date().toISOString(),
    run: {
      id: run.id,
      targetUrl: run.startingUrl,
      status: run.status,
      durationMs: run.durationMs ?? null,
      passedChecks: passed,
      failedChecks: failed,
      warningChecks: warning,
      lcpMs: run.loadMetrics?.lcpMs ?? null,
      cls: run.loadMetrics?.cls ?? null,
      ttfbMs: run.loadMetrics?.ttfbMs ?? null,
    },
  };
}

export async function dispatchRunAlerts(
  run: LatestRun,
  webhooks: WebhookConfig[],
  options?: DispatchAlertsOptions,
): Promise<PromiseSettledResult<void>[]> {
  if (!webhooks || webhooks.length === 0) {
    return [];
  }

  const fetchFn = options?.fetchImpl ?? fetch;
  const timeoutMs = options?.timeoutMs ?? 5000;

  const deliveries = webhooks
    .filter((w) => w.enabled)
    .filter((w) => {
      if (w.triggers.includes("on_every_run")) return true;
      if (w.triggers.includes("on_failure") && run.status === "Failed") return true;
      return false;
    })
    .map(async (w) => {
      let body: string;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "User-Agent": "Helios-Alert-Dispatcher/1.0",
      };

      if (w.provider === "discord") {
        body = JSON.stringify(formatDiscordPayload(run));
      } else if (w.provider === "slack") {
        body = JSON.stringify(formatSlackPayload(run));
      } else {
        const payload = formatGenericPayload(run);
        body = JSON.stringify(payload);
        headers["X-Helios-Event"] = "run.completed";
        if (w.secret) {
          const hmac = crypto.createHmac("sha256", w.secret).update(body).digest("hex");
          headers["X-Helios-Signature"] = `sha256=${hmac}`;
        }
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const res = await fetchFn(w.url, {
          method: "POST",
          headers,
          body,
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`Endpoint returned HTTP ${res.status}`);
        }
      } finally {
        clearTimeout(timer);
      }
    });

  return Promise.allSettled(deliveries);
}
