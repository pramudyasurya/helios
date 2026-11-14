import crypto from "node:crypto";
import { prisma } from "@/lib/server/infrastructure/db/prisma";

export interface GeneratedApiKey {
  rawKey: string;
  keyHash: string;
  keyPrefix: string;
}

export interface ApiKeyVerificationResult {
  valid: boolean;
  apiKeyId?: string;
  projectId?: string;
  projectName?: string;
  error?: "invalid_key" | "expired" | "missing_header";
}

/**
 * Generates a cryptographically secure API key.
 * Format: hel_live_<64 hex chars>
 */
export function generateApiKey(): GeneratedApiKey {
  const randomHex = crypto.randomBytes(32).toString("hex");
  const rawKey = `hel_live_${randomHex}`;
  const keyHash = hashApiKey(rawKey);
  const keyPrefix = rawKey.slice(0, 16); // e.g. "hel_live_a1b2c3d4"

  return {
    rawKey,
    keyHash,
    keyPrefix,
  };
}

/**
 * Computes SHA-256 hash of raw API key for secure persistence and lookup.
 */
export function hashApiKey(rawKey: string): string {
  return crypto.createHash("sha256").update(rawKey.trim()).digest("hex");
}

/**
 * Extracts raw API key from Request Authorization header or x-api-key header.
 */
export function extractApiKeyFromRequest(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader) {
    const [scheme, token] = authHeader.split(" ");
    if (scheme?.toLowerCase() === "bearer" && token) {
      return token.trim();
    }
  }

  const xApiKey = request.headers.get("x-api-key");
  if (xApiKey) {
    return xApiKey.trim();
  }

  return null;
}

/**
 * Verifies an API key against the database, ensuring it exists and is not expired.
 * Also touches `lastUsedAt`.
 */
export async function verifyApiKey(rawKey: string): Promise<ApiKeyVerificationResult> {
  if (!rawKey || !rawKey.startsWith("hel_live_")) {
    return { valid: false, error: "invalid_key" };
  }

  const keyHash = hashApiKey(rawKey);

  const keyRecord = await prisma.apiKey.findUnique({
    where: { keyHash },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  if (!keyRecord) {
    return { valid: false, error: "invalid_key" };
  }

  if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) {
    return {
      valid: false,
      error: "expired",
      apiKeyId: keyRecord.id,
      projectId: keyRecord.projectId,
    };
  }

  // Touch lastUsedAt asynchronously (non-blocking)
  prisma.apiKey
    .update({
      where: { id: keyRecord.id },
      data: { lastUsedAt: new Date() },
    })
    .catch((err) => {
      console.error("[verifyApiKey] Failed to update lastUsedAt:", err);
    });

  return {
    valid: true,
    apiKeyId: keyRecord.id,
    projectId: keyRecord.projectId,
    projectName: keyRecord.project.name,
  };
}
