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

  if (checkHost === "::1") return true;
  if (checkHost.includes(":") && checkHost.replace(/[:0]/g, "") === "") {
    return true;
  }

  if (checkHost.includes(":")) {
    if (checkHost.includes(".")) {
      const lastColon = checkHost.lastIndexOf(":");
      checkHost = checkHost.substring(lastColon + 1);
    } else if (checkHost.startsWith("::")) {
      const parts = checkHost.split(":");
      if (parts.length >= 4) {
        const p1Str = parts[parts.length - 2];
        const p2Str = parts[parts.length - 1];
        const part1 = parseInt(p1Str, 16);
        const part2 = parseInt(p2Str, 16);
        if (!isNaN(part1) && !isNaN(part2)) {
          const b1 = (part1 >> 8) & 255;
          const b2 = part1 & 255;
          const b3 = (part2 >> 8) & 255;
          const b4 = part2 & 255;
          checkHost = `${b1}.${b2}.${b3}.${b4}`;
        }
      }
    }
  }

  if (checkHost === "0.0.0.0") return true;

  if (checkHost === "localhost") return true;

  const parsed = parseIPv4(checkHost);
  if (parsed !== null) {
    const [o1, o2, o3, o4] = parsed;
    if (
      o1 === 127 || // Loopback
      o1 === 10 || // Private Class A
      (o1 === 172 && o2 >= 16 && o2 <= 31) || // Private Class B
      (o1 === 192 && o2 === 168) || // Private Class C
      (o1 === 169 && o2 === 254) || // Link-local
      o1 === 0 || // Wildcard / Non-routable
      o1 >= 224 // Multicast / Reserved
    ) {
      return true;
    }
  }

  if (checkHost.includes(":")) {
    const firstSegment = checkHost.split(":")[0];

    if (
      firstSegment &&
      firstSegment.length <= 4 &&
      /^[0-9a-f]+$/i.test(firstSegment)
    ) {
      const val = parseInt(firstSegment, 16);
      if (
        (val >> 9) === 0x7e || // ULA (fc00::/7)
        (val >> 6) === 0x3fa || // LLA (fe80::/10)
        (val >> 6) === 0x3fb || // Site-local (fec0::/10)
        (val >> 8) === 0xff // Multicast (ff00::/8)
      ) {
        return true;
      }
    }
  }

  return false;
}

function parseIPv4(host: string): number[] | null {
  const segments = host.split(".");
  if (segments.length < 1 || segments.length > 4) return null;

  const nums: number[] = [];

  for (const segment of segments) {
    if (segment.toLowerCase().startsWith("0x")) {
      if (/^0x[0-9a-f]+$/i.test(segment)) {
        nums.push(parseInt(segment, 16));
      } else {
        return null;
      }
    } else if (segment.startsWith("0")) {
      if (segment === "0") {
        nums.push(0);
      } else if (segment.length > 1 && /^0[0-7]+$/.test(segment)) {
        nums.push(parseInt(segment, 8));
      } else {
        return null;
      }
    } else {
      if (/^[0-9]+$/.test(segment)) {
        nums.push(parseInt(segment, 10));
      } else {
        return null;
      }
    }
  }

  if (nums.length === 4) {
    return nums.every((num) => num <= 255) ? nums : null;
  }

  if (nums.length === 3) {
    if (nums[0] > 255 || nums[1] > 255 || nums[2] > 65535) return null;
    const byte3 = Math.floor(nums[2] / 256);
    const byte4 = nums[2] % 256;
    return [nums[0], nums[1], byte3, byte4];
  }

  if (nums.length === 2) {
    if (nums[0] > 255 || nums[1] > 16777215) return null;
    const byte2 = Math.floor(nums[1] / 65536);
    const byte3 = Math.floor((nums[1] % 65536) / 256);
    const byte4 = nums[1] % 256;
    return [nums[0], byte2, byte3, byte4];
  }

  if (nums.length === 1) {
    if (nums[0] > 4294967295) return null;
    const byte1 = Math.floor(nums[0] / 16777216);
    const byte2 = Math.floor((nums[0] % 16777216) / 65536);
    const byte3 = Math.floor((nums[0] % 65536) / 256);
    const byte4 = nums[0] % 256;
    return [byte1, byte2, byte3, byte4];
  }

  return null;
}
