import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { prisma } from "@/lib/server/infrastructure/db/prisma";
import { runEventBus } from "@/lib/server/infrastructure/events/run-event-bus";

vi.mock("@/lib/server/infrastructure/db/prisma", () => ({
  prisma: {
    run: {
      findUnique: vi.fn(),
    },
  },
}));

describe("GET /api/runs/[id]/stream", () => {
  it("returns 404 if run not found", async () => {
    vi.mocked(prisma.run.findUnique).mockResolvedValueOnce(null);

    const req = new NextRequest("http://localhost:3000/api/runs/missing/stream");
    const res = await GET(req, { params: Promise.resolve({ id: "missing" }) });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Run not found");
  });

  it("returns SSE stream with initial snapshot and closes immediately for terminal run", async () => {
    vi.mocked(prisma.run.findUnique).mockResolvedValueOnce({
      id: "run_done",
      status: "Completed",
      summary: "All passed",
      trail: JSON.stringify([{ label: "Init", detail: "Done", timestamp: "2026-11-12T00:00:00Z" }]),
      _count: { evidence: 3 },
    } as unknown as never);

    const req = new NextRequest("http://localhost:3000/api/runs/run_done/stream");
    const res = await GET(req, { params: Promise.resolve({ id: "run_done" }) });

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream; charset=utf-8");
    expect(res.headers.get("Cache-Control")).toBe("no-cache, no-transform");

    const reader = res.body?.getReader();
    expect(reader).toBeDefined();

    const decoder = new TextDecoder();
    const { value } = (await reader?.read()) ?? {};
    const text = decoder.decode(value);

    expect(text).toContain('data: {"type":"init","status":"Completed"');
    expect(text).toContain('"evidenceCount":3');

    const nextRead = await reader?.read();
    expect(nextRead?.done).toBe(true);
  });

  it("streams live events for in-progress run and unsubscribes on client abort", async () => {
    vi.mocked(prisma.run.findUnique).mockResolvedValueOnce({
      id: "run_live",
      status: "Running",
      summary: "In progress",
      trail: "[]",
      _count: { evidence: 0 },
    } as unknown as never);
    const controller = new AbortController();
    const req = new NextRequest("http://localhost:3000/api/runs/run_live/stream", {
      signal: controller.signal,
    });

    const res = await GET(req, { params: Promise.resolve({ id: "run_live" }) });
    expect(res.status).toBe(200);

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();

    // Read initial init event
    const firstChunk = await reader?.read();
    expect(decoder.decode(firstChunk?.value)).toContain('"type":"init"');

    // Emit live trail step
    runEventBus.emitRunEvent("run_live", {
      type: "trail",
      step: {
        label: "Inspecting route",
        detail: "Checking /docs",
        timestamp: "2026-11-12T01:00:00Z",
      },
    });

    const secondChunk = await reader?.read();
    expect(decoder.decode(secondChunk?.value)).toContain('{"type":"trail","step":{"label":"Inspecting route"');

    // Abort connection
    controller.abort();
  });
});
