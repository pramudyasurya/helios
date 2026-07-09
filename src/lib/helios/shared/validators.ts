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
  url: z.url({ error: "Format URL salah" }).refine(
    (val) => {
      try {
        const parsed = new URL(val);

        if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
          return false;

        return !isIpPrivate(parsed.hostname);
      } catch {
        return false;
      }
    },
    { message: "Invalid URL or local address not allowed (SSRF protection)" },
  ),
});

const VALID_QUERY_STATUSES = [
  "Idle",
  "Queued",
  "Running",
  "Completed",
  "Failed",
] as const;

export const GetRunsQuerySchema = z.object({
  q: z.string().trim().optional().default(""),
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

export function isIpPrivate(ip: string): boolean {
  let checkHost = ip.toLowerCase();

  if (checkHost.startsWith("[") && checkHost.endsWith("]")) {
    checkHost = checkHost.slice(1, -1);
  }

  if (checkHost.startsWith("::ffff:")) {
    const suffix = checkHost.substring(7);
    if (suffix.includes(".")) {
      checkHost = suffix;
    } else {
      const parts = suffix.split(":");
      if (parts.length === 2) {
        const part1 = parseInt(parts[0], 16);
        const part2 = parseInt(parts[1], 16);
        if (!isNaN(part1) && !isNaN(part2)) {
          const b1 = (part1 >> 8) & 0xff;
          const b2 = part1 & 0xff;
          const b3 = (part2 >> 8) & 0xff;
          const b4 = part2 & 0xff;
          checkHost = `${b1}.${b2}.${b3}.${b4}`;
        }
      }
    }
  }

  if (checkHost === "0.0.0.0") return true;

  if (checkHost.includes(":")) {
    const result = checkHost.replace(/[:0]/g, "");
    if (result === "") return true;
  }

  if (checkHost === "localhost") return true;

  const ipRegex =
    /^(?:127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+|169\.254\.\d+\.\d+)$/;

  if (ipRegex.test(checkHost)) return true;

  if (checkHost === "::1") return true;

  if (checkHost.includes(":")) {
    const firstSegment = checkHost.split(":")[0];

    if (
      firstSegment &&
      firstSegment.length <= 4 &&
      /^[0-9a-f]+$/i.test(firstSegment)
    ) {
      const val = parseInt(firstSegment, 16);
      if (val >> 9 === 0x7e || val >> 6 === 0x3fa) return true;
    }
  }

  return false;
}
