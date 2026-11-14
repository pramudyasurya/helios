import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { prisma } from "@/lib/server/infrastructure/db/prisma";
import * as auth from "@/lib/server/infrastructure/auth/api-key";

vi.mock("@/lib/server/infrastructure/db/prisma", () => ({
  prisma: {
    run: {
      findUnique: vi.fn(),
    },
  },
}));

describe("GET /api/ci/runs/[id]/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthorized", async () => {
    const req = new Request("http://localhost/api/ci/runs/run-1/status");
    const res = await GET(req, { params: Promise.resolve({ id: "run-1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 404 when run is not found", async () => {
    vi.spyOn(auth, "extractApiKeyFromRequest").mockReturnValue("hel_live_key");
    vi.spyOn(auth, "verifyApiKey").mockResolvedValue({
      valid: true,
      projectId: "proj-1",
    });
    vi.mocked(prisma.run.findUnique).mockResolvedValueOnce(null);

    const req = new Request("http://localhost/api/ci/runs/missing/status");
    const res = await GET(req, { params: Promise.resolve({ id: "missing" }) });
    expect(res.status).toBe(404);
  });

  it("returns status and metrics for valid project run", async () => {
    vi.spyOn(auth, "extractApiKeyFromRequest").mockReturnValue("hel_live_key");
    vi.spyOn(auth, "verifyApiKey").mockResolvedValue({
      valid: true,
      projectId: "proj-1",
    });

    vi.mocked(prisma.run.findUnique).mockResolvedValueOnce({
      id: "run-100",
      status: "completed",
      summary: "5 checks passed",
      startingUrl: "https://staging.helios.run",
      finalUrl: "https://staging.helios.run",
      createdAt: new Date(),
      finishedAt: new Date(),
      durationMs: 3400,
      checks: [
        { status: "passed" },
        { status: "passed" },
        { status: "passed" },
        { status: "failed" },
      ],
      environment: {
        id: "env-1",
        name: "staging",
        projectId: "proj-1",
      },
    } as unknown as Awaited<ReturnType<typeof prisma.run.findUnique>>);

    const req = new Request("http://localhost/api/ci/runs/run-100/status");
    const res = await GET(req, { params: Promise.resolve({ id: "run-100" }) });
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.runId).toBe("run-100");
    expect(data.status).toBe("completed");
    expect(data.isTerminal).toBe(true);
    expect(data.metrics.totalChecks).toBe(4);
    expect(data.metrics.passedChecks).toBe(3);
    expect(data.metrics.passRate).toBe(75);
  });
});
