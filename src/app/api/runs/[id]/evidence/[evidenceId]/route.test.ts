import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  evidence: { update: vi.fn(), findUnique: vi.fn() },
}));

const { PrismaClientKnownRequestError } = vi.hoisted(() => {
  class PrismaClientKnownRequestError extends Error {
    code: string;
    constructor(
      message: string,
      { code }: { code: string; clientVersion?: string; meta?: unknown },
    ) {
      super(message);
      this.name = "PrismaClientKnownRequestError";
      this.code = code;
    }
  }
  return { PrismaClientKnownRequestError };
});

vi.mock("@/lib/server/infrastructure/db/prisma", () => ({
  prisma: prismaMock,
}));
vi.mock("@/generated/prisma/client", () => ({
  Prisma: { PrismaClientKnownRequestError },
}));

import { PATCH } from "@/app/api/runs/[id]/evidence/[evidenceId]/route";

const RUN_ID = "550e8400-e29b-41d4-a716-446655440000";
const EVIDENCE_ID = "660e8400-e29b-41d4-a716-446655440000";

function createPatchRequest(
  body: unknown,
  evidenceId: string = EVIDENCE_ID,
): Request {
  return new Request(
    `http://localhost/api/runs/${RUN_ID}/evidence/${evidenceId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    },
  );
}

function createParams(evidenceId: string = EVIDENCE_ID) {
  return Promise.resolve({ id: RUN_ID, evidenceId });
}

describe("PATCH /api/runs/[id]/evidence/[evidenceId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("returns 200 with the updated evidence when the status is valid (open → resolved)", async () => {
    const updatedRow = {
      id: EVIDENCE_ID,
      runId: RUN_ID,
      pageResultId: null,
      type: "console",
      content: "Uncaught TypeError: Cannot read property 'x' of undefined",
      pageUrl: "https://example.com/page",
      resourceUrl: null,
      status: "resolved",
      severity: "high",
      viewport: "Desktop",
      createdAt: new Date("2026-08-01T10:00:03.000Z"),
      updatedAt: new Date("2026-08-06T12:00:00.000Z"),
    };
    prismaMock.evidence.update.mockResolvedValueOnce(updatedRow);

    const response = await PATCH(createPatchRequest({ status: "resolved" }), {
      params: createParams(),
    });

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toMatchObject({
      id: EVIDENCE_ID,
      status: "resolved",
      severity: "high",
      viewport: "Desktop",
    });
    expect(prismaMock.evidence.update).toHaveBeenCalledWith({
      where: { id: EVIDENCE_ID, runId: RUN_ID },
      data: { status: "resolved" },
    });
  });

  it("returns 400 when the status is not a valid enum value", async () => {
    const response = await PATCH(createPatchRequest({ status: "invalid" }), {
      params: createParams(),
    });

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe("Invalid status");
    expect(prismaMock.evidence.update).not.toHaveBeenCalled();
  });

  it("returns 404 when the evidence record does not exist (Prisma P2025)", async () => {
    prismaMock.evidence.update.mockRejectedValueOnce(
      new PrismaClientKnownRequestError(
        "An operation failed because the record was not found.",
        { code: "P2025" },
      ),
    );

    const response = await PATCH(createPatchRequest({ status: "resolved" }), {
      params: createParams(),
    });

    expect(response.status).toBe(404);
    const json = await response.json();
    expect(json.error).toBe("Evidence not found or unauthorized");
  });

  it("returns 400 when the request body is not valid JSON", async () => {
    const request = new Request(
      `http://localhost/api/runs/${RUN_ID}/evidence/${EVIDENCE_ID}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: "not-valid-json{{{",
      },
    );

    const response = await PATCH(request, { params: createParams() });

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe("Failed to parse request body");
    expect(prismaMock.evidence.update).not.toHaveBeenCalled();
  });
});
