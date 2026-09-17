import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

const prismaMock = vi.hoisted(() => ({
  $queryRaw: vi.fn(),
}));

vi.mock("@/lib/server/infrastructure/db/prisma", () => ({
  prisma: prismaMock,
}));

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with status ok when database is connected", async () => {
    prismaMock.$queryRaw.mockResolvedValueOnce([{ "?column?": 1 }]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe("ok");
    expect(data.database).toBe("connected");
    expect(data.timestamp).toBeDefined();
    expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it("returns 503 with status error when database fails", async () => {
    prismaMock.$queryRaw.mockRejectedValueOnce(new Error("Connection refused"));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.status).toBe("error");
    expect(data.database).toBe("disconnected");
    expect(data.timestamp).toBeDefined();
    expect(data.error).toBe("Connection refused");
    expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(1);
  });
});
