import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { prisma } from "@/lib/server/infrastructure/db/prisma";

vi.mock("@/lib/server/infrastructure/db/prisma", () => ({
  prisma: {
    project: {
      findUnique: vi.fn(),
    },
    run: {
      count: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

describe("GET /api/projects/[projectId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns project with environments including parsed webhooks", async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: "p1",
      name: "Acme",
      environments: [
        {
          id: "env-1",
          projectId: "p1",
          name: "Production",
          baseUrl: "https://acme.com",
          storageState: {
            webhooks: [
              {
                id: "w-1",
                url: "https://discord.com/api/webhooks/test",
                provider: "discord",
                triggers: ["on_failure"],
                enabled: true,
              },
            ],
          },
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
          runs: [],
        },
      ],
    } as unknown as { id: string; name: string; environments: Array<Record<string, unknown>> });
    vi.mocked(prisma.run.count).mockResolvedValue(10);
    vi.mocked(prisma.run.findFirst).mockResolvedValue(null);

    const req = new Request("http://localhost/api/projects/p1");
    const res = await GET(req, {
      params: Promise.resolve({ projectId: "p1" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("p1");
    expect(body.environments).toHaveLength(1);
    expect(body.environments[0].webhooks).toEqual([
      {
        id: "w-1",
        url: "https://discord.com/api/webhooks/test",
        provider: "discord",
        triggers: ["on_failure"],
        enabled: true,
      },
    ]);
  });
});
