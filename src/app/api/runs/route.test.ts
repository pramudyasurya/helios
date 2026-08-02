import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  environment: { findUnique: vi.fn() },
  run: {
    count: vi.fn(),
    create: vi.fn(),
    deleteMany: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
}));
const queueMock = vi.hoisted(() => ({ enqueueQARun: vi.fn() }));

vi.mock("@/lib/server/infrastructure/db/prisma", () => ({
  prisma: prismaMock,
}));
vi.mock("@/lib/server/infrastructure/queue/qa-jobs", () => queueMock);
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));

import { POST } from "@/app/api/runs/route";

function createRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/runs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/runs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a project without its required environment before persisting", async () => {
    const response = await POST(
      createRequest({
        url: "https://example.com",
        projectId: "project-1",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "Invalid run configuration",
      message: "Select both a Project and an Environment, or run without context.",
    });
    expect(prismaMock.run.create).not.toHaveBeenCalled();
    expect(queueMock.enqueueQARun).not.toHaveBeenCalled();
  });

  it("rejects a client-supplied CI origin before persisting", async () => {
    const response = await POST(
      createRequest({
        url: "https://example.com",
        origin: "ci",
      }),
    );

    expect(response.status).toBe(400);
    expect(prismaMock.run.create).not.toHaveBeenCalled();
    expect(queueMock.enqueueQARun).not.toHaveBeenCalled();
  });
});
