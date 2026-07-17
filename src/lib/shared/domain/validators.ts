import {
  type AIReport,
  AI_RISK_LEVELS,
  EVIDENCE_STATUSES,
} from "@/lib/shared/domain/types";
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

  if (checkHost.includes(":")) {
    const segs = expandIPv6(checkHost);

    if (segs === null) return false;

    const [s0, s1, s2, s3, s4, s5, s6, s7] = segs;

    if (segs.every((s) => s === 0)) return true;

    if (
      s0 === 0 &&
      s1 === 0 &&
      s2 === 0 &&
      s3 === 0 &&
      s4 === 0 &&
      s5 === 0 &&
      s6 === 0 &&
      s7 === 1
    ) {
      return true;
    }

    if (
      s0 >> 9 === 0x7e || // ULA
      s0 >> 6 === 0x3fa || // LLA
      s0 >> 6 === 0x3fb || // Site-Local
      s0 >> 8 === 0xff // Multicast
    ) {
      return true;
    }

    let isCompat = false;
    let isMapped = false;

    if (
      s0 === 0 &&
      s1 === 0 &&
      s2 === 0 &&
      s3 === 0 &&
      s4 === 0 &&
      (s5 === 0 || s5 === 0xffff)
    ) {
      isCompat = true;
    }

    if (
      s0 === 0 &&
      s1 === 0 &&
      s2 === 0 &&
      s3 === 0 &&
      s4 === 0xffff &&
      s5 === 0
    ) {
      isMapped = true;
    }

    if (isCompat || isMapped) {
      const o1 = (s6 >> 8) & 255;
      const o2 = s6 & 255;

      if (
        o1 === 127 ||
        o1 === 10 ||
        (o1 === 172 && o2 >= 16 && o2 <= 31) ||
        (o1 === 192 && o2 === 168) ||
        (o1 === 169 && o2 === 254) ||
        o1 === 0 ||
        o1 >= 224
      ) {
        return true;
      }
    }

    return false;
  }

  if (checkHost === "0.0.0.0") return true;

  if (checkHost === "localhost") return true;

  const parsed = parseIPv4(checkHost);
  if (parsed !== null) {
    const [o1, o2] = parsed;
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

const expandIPv6 = (host: string): number[] | null => {
  if (host.split("::").length > 2) return null;

  if (!host.includes(":")) return null;

  if (host.includes(".")) {
    const lastIndex = host.lastIndexOf(":");

    const ipv4Str = host.substring(lastIndex + 1);
    const parsed = parseIPv4(ipv4Str);

    if (parsed === null) return null;

    const [o1, o2, o3, o4] = parsed;

    const hex1 = ((o1 << 8) | o2).toString(16);
    const hex2 = ((o3 << 8) | o4).toString(16);

    host = host.substring(0, lastIndex + 1) + hex1 + ":" + hex2;
  }

  let segments: string[] = [];

  if (host.includes("::")) {
    const doubleColonIndex = host.indexOf("::");
    const leftPart = host.substring(0, doubleColonIndex);
    const rightPart = host.substring(doubleColonIndex + 2);

    const leftSegments = leftPart.split(":").filter(Boolean);
    const rightSegments = rightPart.split(":").filter(Boolean);

    const zeroCount = 8 - (leftSegments.length + rightSegments.length);

    if (zeroCount < 0) return null;

    segments = [
      ...leftSegments,
      ...Array(zeroCount).fill("0"),
      ...rightSegments,
    ];
  } else {
    segments = host.split(":");

    if (segments.length !== 8) return null;
  }

  const nums: number[] = [];

  for (const seg of segments) {
    if (/^[0-9a-f]{1,4}$/i.test(seg)) nums.push(parseInt(seg, 16));
    else return null;
  }

  return nums;
};
