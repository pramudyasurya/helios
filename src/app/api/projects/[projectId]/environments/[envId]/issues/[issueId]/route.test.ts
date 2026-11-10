import { describe, it, expect, vi, beforeEach } from "vitest";
import { PATCH } from "./route";

const mockFindUnique = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@/lib/server/infrastructure/db/prisma", () => ({
  prisma: {
    issue: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}));

describe("PATCH /api/projects/[projectId]/environments/[envId]/issues/[issueId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for invalid status", async () => {
    const req = new Request("http://localhost/api", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "invalid_status" }),
    });

    const res = await PATCH(req, {
      params: Promise.resolve({
        projectId: "p1",
        envId: "e1",
        issueId: "i1",
      }),
    });

    expect(res.status).toBe(400);
  });

  it("returns 404 if issue does not exist or environment mismatch", async () => {
    mockFindUnique.mockResolvedValue(null);

    const req = new Request("http://localhost/api", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ignored" }),
    });

    const res = await PATCH(req, {
      params: Promise.resolve({
        projectId: "p1",
        envId: "e1",
        issueId: "i1",
      }),
    });

    expect(res.status).toBe(404);
  });

  it("updates issue status to ignored", async () => {
    mockFindUnique.mockResolvedValue({
      id: "i1",
      environmentId: "e1",
      environment: { projectId: "p1" },
    });
    mockUpdate.mockResolvedValue({
      id: "i1",
      status: "ignored",
    });

    const req = new Request("http://localhost/api", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ignored" }),
    });

    const res = await PATCH(req, {
      params: Promise.resolve({
        projectId: "p1",
        envId: "e1",
        issueId: "i1",
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.issue.status).toBe("ignored");
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "i1" },
      data: { status: "ignored" },
    });
  });
});
