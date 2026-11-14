import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateApiKey,
  hashApiKey,
  extractApiKeyFromRequest,
  verifyApiKey,
} from "./api-key";
import { prisma } from "@/lib/server/infrastructure/db/prisma";

vi.mock("@/lib/server/infrastructure/db/prisma", () => ({
  prisma: {
    apiKey: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
  },
}));

describe("api-key infrastructure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateApiKey & hashApiKey", () => {
    it("generates a key with the expected prefix and length", () => {
      const key = generateApiKey();
      expect(key.rawKey.startsWith("hel_live_")).toBe(true);
      expect(key.keyPrefix.startsWith("hel_live_")).toBe(true);
      expect(key.keyPrefix.length).toBe(16);
      expect(key.keyHash).toBe(hashApiKey(key.rawKey));
    });

    it("produces deterministic SHA-256 hashes", () => {
      const raw = "hel_live_test_token_123";
      const hash1 = hashApiKey(raw);
      const hash2 = hashApiKey(raw);
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });
  });

  describe("extractApiKeyFromRequest", () => {
    it("extracts Bearer token from Authorization header", () => {
      const req = new Request("http://localhost", {
        headers: {
          authorization: "Bearer hel_live_secret123",
        },
      });
      expect(extractApiKeyFromRequest(req)).toBe("hel_live_secret123");
    });

    it("extracts token from x-api-key header", () => {
      const req = new Request("http://localhost", {
        headers: {
          "x-api-key": "hel_live_secret456",
        },
      });
      expect(extractApiKeyFromRequest(req)).toBe("hel_live_secret456");
    });

    it("returns null when no auth header is present", () => {
      const req = new Request("http://localhost");
      expect(extractApiKeyFromRequest(req)).toBeNull();
    });
  });

  describe("verifyApiKey", () => {
    it("returns invalid_key if token format is wrong", async () => {
      const res = await verifyApiKey("invalid_prefix_token");
      expect(res.valid).toBe(false);
      expect(res.error).toBe("invalid_key");
    });

    it("returns invalid_key if not found in db", async () => {
      vi.mocked(prisma.apiKey.findUnique).mockResolvedValueOnce(null);

      const res = await verifyApiKey("hel_live_notfound");
      expect(res.valid).toBe(false);
      expect(res.error).toBe("invalid_key");
    });

    it("returns expired if key is past expiration date", async () => {
      vi.mocked(prisma.apiKey.findUnique).mockResolvedValueOnce({
        id: "key-1",
        projectId: "proj-1",
        keyHash: "dummyhash",
        keyPrefix: "hel_live_1234",
        name: "CI Key",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastUsedAt: null,
        expiresAt: new Date(Date.now() - 10000), // in the past
        project: {
          id: "proj-1",
          name: "Helios Project",
          slug: "helios-project",
        },
      } as unknown as Awaited<ReturnType<typeof prisma.apiKey.findUnique>>);

      const res = await verifyApiKey("hel_live_expired123");
      expect(res.valid).toBe(false);
      expect(res.error).toBe("expired");
    });

    it("returns valid and project details for valid key", async () => {
      vi.mocked(prisma.apiKey.findUnique).mockResolvedValueOnce({
        id: "key-1",
        projectId: "proj-1",
        keyHash: "dummyhash",
        keyPrefix: "hel_live_1234",
        name: "CI Key",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastUsedAt: null,
        expiresAt: null,
        project: {
          id: "proj-1",
          name: "Helios Project",
          slug: "helios-project",
        },
      } as unknown as Awaited<ReturnType<typeof prisma.apiKey.findUnique>>);

      const res = await verifyApiKey("hel_live_valid123");
      expect(res.valid).toBe(true);
      expect(res.projectId).toBe("proj-1");
      expect(res.projectName).toBe("Helios Project");
      expect(prisma.apiKey.update).toHaveBeenCalledWith({
        where: { id: "key-1" },
        data: { lastUsedAt: expect.any(Date) },
      });
    });
  });
});
