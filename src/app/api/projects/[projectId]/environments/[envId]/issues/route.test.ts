import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

const mockFindUnique = vi.fn();
const mockFindMany = vi.fn();
const mockCount = vi.fn();

vi.mock("@/lib/server/infrastructure/db/prisma", () => ({
  prisma: {
    environment: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
    issue: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      count: (...args: unknown[]) => mockCount(...args),
    },
  },
}));

describe("GET /api/projects/[projectId]/environments/[envId]/issues", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 when environment does not exist", async () => {
    mockFindUnique.mockResolvedValue(null);

    const req = new Request("http://localhost/api");
    const res = await GET(req, {
      params: Promise.resolve({ projectId: "p1", envId: "e1" }),
    });

    expect(res.status).toBe(404);
  });

  it("returns issues list and count with filters applied", async () => {
    mockFindUnique.mockResolvedValue({ id: "e1", projectId: "p1" });
    mockFindMany.mockResolvedValue([
      {
        id: "i1",
        fingerprint: "fp1",
        type: "console",
        normalizedMessage: "ReferenceError: foo is not defined",
        status: "open",
        occurrences: 5,
      },
    ]);
    mockCount.mockResolvedValue(1);

    const req = new Request("http://localhost/api?status=open&type=console");
    const res = await GET(req, {
      params: Promise.resolve({ projectId: "p1", envId: "e1" }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.total).toBe(1);
    expect(data.issues).toHaveLength(1);
    expect(data.issues[0].normalizedMessage).toBe("ReferenceError: foo is not defined");
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          environmentId: "e1",
          status: "open",
          type: "console",
        },
      }),
    );
  });
});
