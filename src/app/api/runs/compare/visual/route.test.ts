import { describe, expect, it, vi } from "vitest";

import { GET } from "./route";
import { prisma } from "@/lib/server/infrastructure/db/prisma";
import * as visualDiffModule from "@/lib/server/infrastructure/runner/visual-diff";

vi.mock("@/lib/server/infrastructure/db/prisma", () => ({
  prisma: {
    run: {
      findUnique: vi.fn(),
    },
  },
}));

describe("GET /api/runs/compare/visual", () => {
  it("returns 400 when missing query parameters", async () => {
    const request = new Request("http://localhost/api/runs/compare/visual?runA=run-1");
    const response = await GET(request);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toBe("Invalid query parameters");
  });

  it("returns 404 when either run does not exist", async () => {
    vi.mocked(prisma.run.findUnique).mockResolvedValueOnce({ id: "run-1" } as unknown as never);
    vi.mocked(prisma.run.findUnique).mockResolvedValueOnce(null);

    const request = new Request("http://localhost/api/runs/compare/visual?runA=run-1&runB=run-2");
    const response = await GET(request);
    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body.error).toBe("Not found");
  });

  it("returns 200 with visual diff comparison when both runs exist", async () => {
    vi.mocked(prisma.run.findUnique).mockResolvedValueOnce({ id: "run-1" } as unknown as never);
    vi.mocked(prisma.run.findUnique).mockResolvedValueOnce({ id: "run-2" } as unknown as never);

    vi.spyOn(visualDiffModule, "compareRunVisuals").mockResolvedValueOnce({
      items: [
        {
          viewport: "desktop",
          runAImage: "/artifacts/runs/run-1/desktop.png",
          runBImage: "/artifacts/runs/run-2/desktop.png",
          diffImage: "/artifacts/diffs/run-1--run-2/desktop-diff.png",
          diffPixelCount: 42,
          diffPercentage: 0.15,
          width: 1280,
          height: 720,
          hasDiff: true,
          status: "diff",
        },
      ],
      totalDiffPixels: 42,
      maxDiffPercentage: 0.15,
      hasVisualDiff: true,
    });

    const request = new Request("http://localhost/api/runs/compare/visual?runA=run-1&runB=run-2");
    const response = await GET(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.data.hasVisualDiff).toBe(true);
    expect(body.data.totalDiffPixels).toBe(42);
    expect(body.data.items).toHaveLength(1);
    expect(body.data.items[0].status).toBe("diff");
  });
});
