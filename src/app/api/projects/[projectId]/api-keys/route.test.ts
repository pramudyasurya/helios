import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "./route";
import { prisma } from "@/lib/server/infrastructure/db/prisma";

vi.mock("@/lib/server/infrastructure/db/prisma", () => ({
  prisma: {
    project: {
      findUnique: vi.fn(),
    },
    apiKey: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe("API Keys project route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("returns 404 if project is missing", async () => {
      vi.mocked(prisma.project.findUnique).mockResolvedValueOnce(null);

      const res = await GET(new Request("http://localhost"), {
        params: Promise.resolve({ projectId: "missing-id" }),
      });

      expect(res.status).toBe(404);
    });

    it("returns list of keys without raw hashes", async () => {
      vi.mocked(prisma.project.findUnique).mockResolvedValueOnce({ id: "p1" } as unknown as Awaited<ReturnType<typeof prisma.project.findUnique>>);
      vi.mocked(prisma.apiKey.findMany).mockResolvedValueOnce([
        {
          id: "k1",
          name: "GitHub Actions",
          keyPrefix: "hel_live_1234",
          lastUsedAt: null,
          expiresAt: null,
          createdAt: new Date(),
        } as unknown as Awaited<ReturnType<typeof prisma.apiKey.findMany>>[number],
      ]);

      const res = await GET(new Request("http://localhost"), {
        params: Promise.resolve({ projectId: "p1" }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.apiKeys).toHaveLength(1);
      expect(data.apiKeys[0].keyPrefix).toBe("hel_live_1234");
    });
  });
  describe("POST", () => {
    it("validates name presence", async () => {
      const res = await POST(
        new Request("http://localhost", {
          method: "POST",
          body: JSON.stringify({ name: "" }),
        }),
        { params: Promise.resolve({ projectId: "p1" }) }
      );

      expect(res.status).toBe(400);
    });

    it("creates key and returns rawKey once", async () => {
      vi.mocked(prisma.project.findUnique).mockResolvedValueOnce({ id: "p1" } as unknown as Awaited<ReturnType<typeof prisma.project.findUnique>>);
      vi.mocked(prisma.apiKey.create).mockImplementationOnce((async ({ data }: { data: { name: string; keyPrefix: string; expiresAt: Date | null } }) => ({
        id: "new-key-id",
        name: data.name,
        keyPrefix: data.keyPrefix,
        expiresAt: data.expiresAt,
        createdAt: new Date(),
      })) as unknown as typeof prisma.apiKey.create);

      const res = await POST(
        new Request("http://localhost", {
          method: "POST",
          body: JSON.stringify({ name: "CI Pipeline", expiresInDays: 30 }),
        }),
        { params: Promise.resolve({ projectId: "p1" }) }
      );

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.rawKey).toMatch(/^hel_live_/);
      expect(data.apiKey.name).toBe("CI Pipeline");
      expect(data.apiKey.keyPrefix).toBe(data.rawKey.slice(0, 16));
    });
  });
});
