import { createHash } from "node:crypto";
import { tryExtractUrl } from "@/lib/shared/domain/evidence-transformer";
import type { CheckSeverity, EvidenceType } from "@/lib/shared/domain/types";

export type FingerprintInput = {
  environmentId: string;
  type: EvidenceType;
  message: string;
};

const UUID_PATTERN =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const TIMESTAMP_PATTERN =
  /\b(?:\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?|\d{1,2}:\d{2}:\d{2}(?:\.\d+)?)\b/g;
const LINE_COLUMN_PATTERN = /([^\s:]+):(\d+):(\d+)\b/g;
const MAX_MESSAGE_LENGTH = 4000;

export function normalizeMessage(raw: string): string {
  // Evidence is attacker-controlled; cap before any regex so pathological
  // input (long non-space runs with colons) stays linear-time.
  const bounded =
    raw.length > MAX_MESSAGE_LENGTH ? raw.slice(0, MAX_MESSAGE_LENGTH) : raw;

  return bounded
    .replace(/^\[(?:Desktop|Mobile)\]\s+/, "")
    .replace(UUID_PATTERN, "<uuid>")
    .replace(TIMESTAMP_PATTERN, "<ts>")
    .replace(LINE_COLUMN_PATTERN, "$1:<line>:<col>")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Normalizes a resource URL for fingerprinting. Deliberately stricter than
 * tryExtractUrl: query, hash, default ports, duplicate slashes, and trailing
 * slashes are stripped so the same resource hashes identically across runs.
 */
export function normalizeResourceUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return raw.split("?")[0].split("#")[0].toLowerCase();
  }

  if (
    (url.protocol === "http:" && url.port === "80") ||
    (url.protocol === "https:" && url.port === "443")
  ) {
    url.port = "";
  }

  url.hash = "";
  url.search = "";

  const pathname = url.pathname.replace(/\/{2,}/g, "/");
  url.pathname =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname;

  return url.toString();
}

/**
 * Type-aware normalization for fingerprint preimages. Console evidence goes
 * through normalizeMessage; network/image evidence swaps its URL for the
 * normalized form (query/hash/default-port/trailing-slash variance collapses)
 * so one resource with cosmetic URL drift still hashes to one issue. Non-URL
 * or unparseable content falls back to normalizeMessage.
 */
export function normalizeEvidenceMessage(
  type: EvidenceType,
  raw: string,
): string {
  if (type === "console") {
    return normalizeMessage(raw);
  }
  const url = tryExtractUrl(raw);
  if (url === undefined) {
    return normalizeMessage(raw);
  }
  // Replace the textual span (not the canonical form) so case variance in the
  // original still matches the same normalized resource.
  const rawUrl = raw.match(/https?:\/\/[^\s"'<>]+/)?.[0] ?? url;
  const stableUrl = normalizeResourceUrl(url);
  return normalizeMessage(raw.replace(rawUrl, stableUrl));
}

/**
 * SHA-256 over the JSON tuple [environmentId, type, normalizedMessage].
 * JSON.stringify avoids delimiter collisions; environmentId in the preimage
 * scopes otherwise-identical messages per environment.
 */
export function computeFingerprint(input: FingerprintInput): string {
  return createHash("sha256")
    .update(
      JSON.stringify([
        input.environmentId,
        input.type,
        normalizeEvidenceMessage(input.type, input.message),
      ]),
    )
    .digest("hex");
}

const SEVERITY_BY_TYPE: Record<EvidenceType, CheckSeverity> = {
  console: "low",
  network: "medium",
  image: "medium",
};

export function deriveSeverity(type: EvidenceType): CheckSeverity {
  return SEVERITY_BY_TYPE[type];
}
