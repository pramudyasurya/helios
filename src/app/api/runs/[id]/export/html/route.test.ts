import { describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const prismaMock = vi.hoisted(() => ({
  run: {
    findUnique: vi.fn(),
  },
}));

vi.mock("@/lib/server/infrastructure/db/prisma", () => ({
  prisma: prismaMock,
}));

describe("GET /api/runs/[id]/export/html", () => {
  it("returns 404 when run does not exist", async () => {
    prismaMock.run.findUnique.mockResolvedValueOnce(null);

    const response = await GET(new Request("http://localhost/api/runs/nonexistent/export/html"), {
      params: Promise.resolve({ id: "nonexistent" }),
    });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Run not found.");
  });

  it("returns 200 with text/html attachment header when run exists", async () => {
    prismaMock.run.findUnique.mockResolvedValueOnce({
      id: "run-export-1",
      status: "Completed",
      startingUrl: "https://example.com",
      finalUrl: "https://example.com",
      summary: "Run successful",
      checks: [],
      trail: [],
      createdAt: new Date(),
      finishedAt: new Date(),
      pageResults: [],
      evidence: [],
      project: null,
      environment: null,
    });

    const response = await GET(new Request("http://localhost/api/runs/run-export-1/export/html"), {
      params: Promise.resolve({ id: "run-export-1" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(response.headers.get("content-disposition")).toContain('attachment; filename="helios-audit-run-export-1.html"');
    const html = await response.text();
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Helios QA Audit Report - run-export-1");
  });
});
