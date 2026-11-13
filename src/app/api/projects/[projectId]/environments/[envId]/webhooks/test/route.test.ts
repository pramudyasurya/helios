import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { prisma } from "@/lib/server/infrastructure/db/prisma";
import * as dispatcher from "@/lib/server/infrastructure/notifications/webhook-dispatcher";

vi.mock("@/lib/server/infrastructure/db/prisma", () => ({
  prisma: {
    environment: {
      findFirst: vi.fn(),
    },
  },
}));

describe("POST /api/projects/[projectId]/environments/[envId]/webhooks/test", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 when environment does not exist", async () => {
    vi.mocked(prisma.environment.findFirst).mockResolvedValue(null);

    const req = new Request("http://localhost/api/test", {
      method: "POST",
      body: JSON.stringify({
        id: "w1",
        url: "https://example.com/webhook",
        provider: "generic",
        triggers: ["on_failure"],
        enabled: true,
      }),
    });

    const res = await POST(req, {
      params: Promise.resolve({ projectId: "p1", envId: "e1" }),
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Environment not found");
  });

  it("returns 400 when webhook config is invalid", async () => {
    vi.mocked(prisma.environment.findFirst).mockResolvedValue({
      id: "e1",
      name: "Staging",
      baseUrl: "https://staging.example.com",
    } as unknown as never);

    const req = new Request("http://localhost/api/test", {
      method: "POST",
      body: JSON.stringify({
        url: "not-a-valid-url",
      }),
    });

    const res = await POST(req, {
      params: Promise.resolve({ projectId: "p1", envId: "e1" }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid webhook configuration");
  });

  it("dispatches test alert and returns 200 on success", async () => {
    vi.mocked(prisma.environment.findFirst).mockResolvedValue({
      id: "e1",
      name: "Staging",
      baseUrl: "https://staging.example.com",
    } as unknown as never);

    const dispatchSpy = vi.spyOn(dispatcher, "dispatchRunAlerts").mockResolvedValue([
      {
        status: "fulfilled",
        value: undefined,
      },
    ]);

    const req = new Request("http://localhost/api/test", {
      method: "POST",
      body: JSON.stringify({
        id: "w1",
        url: "https://example.com/hook",
        provider: "generic",
        triggers: ["on_failure"],
        enabled: true,
      }),
    });

    const res = await POST(req, {
      params: Promise.resolve({ projectId: "p1", envId: "e1" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(dispatchSpy).toHaveBeenCalledTimes(1);
  });

  it("returns 502 with error details if endpoint rejects test dispatch", async () => {
    vi.mocked(prisma.environment.findFirst).mockResolvedValue({
      id: "e1",
      name: "Staging",
      baseUrl: "https://staging.example.com",
    } as unknown as never);

    vi.spyOn(dispatcher, "dispatchRunAlerts").mockResolvedValue([
      {
        status: "rejected",
        reason: new Error("Endpoint returned HTTP 500"),
      },
    ]);

    const req = new Request("http://localhost/api/test", {
      method: "POST",
      body: JSON.stringify({
        id: "w1",
        url: "https://hooks.slack.com/services/xxx",
        provider: "slack",
        triggers: ["on_failure"],
        enabled: true,
      }),
    });

    const res = await POST(req, {
      params: Promise.resolve({ projectId: "p1", envId: "e1" }),
    });

    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe("Endpoint returned HTTP 500");
  });
});
