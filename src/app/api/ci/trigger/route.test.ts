import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { prisma } from "@/lib/server/infrastructure/db/prisma";
import { enqueueQARun } from "@/lib/server/infrastructure/queue/qa-jobs";
import * as auth from "@/lib/server/infrastructure/auth/api-key";

vi.mock("@/lib/server/infrastructure/db/prisma", () => ({
  prisma: {
    environment: {
      findFirst: vi.fn(),
    },
    run: {
      create: vi.fn().mockResolvedValue({}),
    },
  },
}));

vi.mock("@/lib/server/infrastructure/queue/qa-jobs", () => ({
  enqueueQARun: vi.fn(),
}));

describe("POST /api/ci/trigger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when missing api key", async () => {
    const req = new Request("http://localhost/api/ci/trigger", {
      method: "POST",
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 401 when api key is invalid", async () => {
    vi.spyOn(auth, "extractApiKeyFromRequest").mockReturnValue("hel_live_badkey");
    vi.spyOn(auth, "verifyApiKey").mockResolvedValue({
      valid: false,
      error: "invalid_key",
    });

    const req = new Request("http://localhost/api/ci/trigger", {
      method: "POST",
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when target url cannot be resolved", async () => {
    vi.spyOn(auth, "extractApiKeyFromRequest").mockReturnValue("hel_live_valid");
    vi.spyOn(auth, "verifyApiKey").mockResolvedValue({
      valid: true,
      projectId: "proj-1",
      projectName: "Helios QA",
    });
    vi.mocked(prisma.environment.findFirst).mockResolvedValueOnce(null);

    const req = new Request("http://localhost/api/ci/trigger", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Target URL required");
  });

  it("enqueues run and returns 202 on valid trigger", async () => {
    vi.spyOn(auth, "extractApiKeyFromRequest").mockReturnValue("hel_live_valid");
    vi.spyOn(auth, "verifyApiKey").mockResolvedValue({
      valid: true,
      projectId: "proj-1",
      projectName: "Helios QA",
    });

    vi.mocked(prisma.environment.findFirst).mockResolvedValueOnce({
      id: "env-1",
      name: "staging",
      baseUrl: "https://staging.helios.run",
      projectId: "proj-1",
    } as unknown as Awaited<ReturnType<typeof prisma.environment.findFirst>>);

    vi.mocked(enqueueQARun).mockResolvedValueOnce("job-123");

    const req = new Request("http://localhost/api/ci/trigger", {
      method: "POST",
      body: JSON.stringify({ environment: "staging" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(202);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.status).toBe("queued");
    expect(data.targetUrl).toBe("https://staging.helios.run");
    expect(enqueueQARun).toHaveBeenCalledWith(
      expect.objectContaining({
        submittedUrl: "https://staging.helios.run",
        mode: "single",
      })
    );
  });
});
