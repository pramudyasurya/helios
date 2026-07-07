import {
  type AIReport,
  AI_RISK_LEVELS,
  EVIDENCE_STATUSES,
} from "@/lib/helios/shared/types";
import { z } from "zod";

export function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateAIReport(data: unknown): AIReport | null {
  const result = AIReportSchema.safeParse(data);
  return result.success ? result.data : null;
}

export const CreateRunSchema = z.object({
  url: z
    .string()
    .url()
    .refine(
      (val) => {
        try {
          const parsed = new URL(val);
          const hostname = parsed.hostname.toLowerCase();
          if (hostname === "localhost") return false;

          const ipRegex =
            /^(?:127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+|169\.254\.\d+\.\d+)$/;

          if (ipRegex.test(hostname)) return false;

          if (
            hostname === "::1" ||
            hostname.startsWith("fe80:") ||
            hostname.startsWith("fc00:") ||
            hostname.startsWith("fd00:")
          ) {
            return false;
          }

          return true;
        } catch {
          return false;
        }
      },
      { message: "Invalid URL or local address not allowed (SSRF protection)" },
    ),
});

const VALID_QUERY_STATUSES = [
  "Queued",
  "Running",
  "Completed",
  "Failed",
] as const;

export const GetRunsQuerySchema = z.object({
  q: z.string().optional().default(""),
  status: z.enum(VALID_QUERY_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const UpdateEvidenceStatusSchema = z.object({
  status: z.enum(EVIDENCE_STATUSES),
});

export const AIReportSchema = z.object({
  summary: z.string(),
  riskLevel: z.enum(AI_RISK_LEVELS),
  findings: z.array(
    z.object({
      title: z.string(),
      severity: z.enum(AI_RISK_LEVELS),
      evidenceIds: z.array(z.string()),
      suggestedFix: z.string().optional(),
    }),
  ),
  suggestedActions: z.array(z.string()),
});
