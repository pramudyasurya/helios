import { z } from "zod";

export const WEBHOOK_PROVIDERS = ["discord", "slack", "generic"] as const;
export type WebhookProvider = (typeof WEBHOOK_PROVIDERS)[number];

export const WEBHOOK_TRIGGERS = ["on_failure", "on_every_run"] as const;
export type WebhookTrigger = (typeof WEBHOOK_TRIGGERS)[number];

export type WebhookConfig = {
  id: string;
  url: string;
  provider: WebhookProvider;
  triggers: WebhookTrigger[];
  secret?: string;
  enabled: boolean;
};

export const WebhookConfigSchema = z.object({
  id: z.string().min(1),
  url: z.string().url().refine((val) => {
    try {
      const u = new URL(val);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  }, { message: "Webhook URL must be HTTP or HTTPS" }),
  provider: z.enum(WEBHOOK_PROVIDERS),
  triggers: z.array(z.enum(WEBHOOK_TRIGGERS)).min(1),
  secret: z.string().optional(),
  enabled: z.boolean().default(true),
});

export const WebhookPayloadSchema = z.object({
  event: z.literal("run.completed"),
  timestamp: z.string(),
  run: z.object({
    id: z.string(),
    targetUrl: z.string(),
    status: z.string(),
    durationMs: z.number().nullable(),
    passedChecks: z.number(),
    failedChecks: z.number(),
    warningChecks: z.number(),
    lcpMs: z.number().nullable().optional(),
    cls: z.number().nullable().optional(),
    ttfbMs: z.number().nullable().optional(),
  }),
});
export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>;
