import { describe, expect, it } from "vitest";
import { transformRawEvidence } from "@/lib/shared/domain/evidence-transformer";

describe("transformRawEvidence", () => {
  it("adds stable metadata to parsed evidence", () => {
    const evidence = transformRawEvidence({
      runId: "run_123",
      capturedAt: "2026-06-24T10:00:00.000Z",
      pageUrl: "https://example.com/dashboard",
      brokenImages: ["https://cdn.example.com/logo.png"],
      consoleErrors: ["[Desktop] Uncaught Error: Something failed"],
      failedRequests: [
        "[Mobile] https://api.example.com/users - net::ERR_FAILED",
      ],
    });

    expect(evidence).toHaveLength(3);
    expect(evidence[0]).toMatchObject({
      id: "run_123:image:0",
      type: "image",
      pageUrl: "https://example.com/dashboard",
      resourceUrl: "https://cdn.example.com/logo.png",
      capturedAt: "2026-06-24T10:00:00.000Z",
    });
  });

  it("keeps page context when a resource URL is not present", () => {
    const [evidence] = transformRawEvidence({
      runId: "run_456",
      capturedAt: "2026-06-24T11:00:00.000Z",
      pageUrl: "https://example.com/settings",
      consoleErrors: ["[Desktop] Uncaught Error: Something failed"],
    });

    expect(evidence).toMatchObject({
      id: "run_456:console:0",
      type: "console",
      pageUrl: "https://example.com/settings",
      resourceUrl: undefined,
    });
  });
});
