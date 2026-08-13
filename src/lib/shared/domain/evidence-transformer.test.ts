import { describe, expect, it } from "vitest";
import {
  extractViewport,
  transformRawEvidence,
} from "@/lib/shared/domain/evidence-transformer";

describe("extractViewport", () => {
  it("extracts the Desktop viewport and strips the prefix", () => {
    expect(extractViewport("[Desktop] Uncaught Error: Foo")).toEqual({
      viewport: "Desktop",
      content: "Uncaught Error: Foo",
    });
  });

  it("extracts the Mobile viewport and strips the prefix", () => {
    expect(
      extractViewport("[Mobile] net::ERR_FAILED on /api/users"),
    ).toEqual({
      viewport: "Mobile",
      content: "net::ERR_FAILED on /api/users",
    });
  });

  it("does not match the Helios prefix and keeps the content intact", () => {
    const result = extractViewport("[Helios] review note");

    expect(result.viewport).toBeUndefined();
    expect(result.content).toBe("[Helios] review note");
  });

  it("returns plain content untouched when no viewport prefix is present", () => {
    const result = extractViewport("plain text without a prefix");

    expect(result.viewport).toBeUndefined();
    expect(result.content).toBe("plain text without a prefix");
  });
});

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

  it("sets the viewport on console errors tagged with a viewport prefix", () => {
    const [evidence] = transformRawEvidence({
      runId: "run_vp_desktop",
      capturedAt: "2026-06-24T10:00:00.000Z",
      pageUrl: "https://example.com/dashboard",
      consoleErrors: ["[Desktop] Uncaught Error: Something failed"],
    });

    expect(evidence).toMatchObject({
      id: "run_vp_desktop:console:0",
      type: "console",
      viewport: "Desktop",
    });
  });

  it("strips the viewport prefix from the content field", () => {
    const [evidence] = transformRawEvidence({
      runId: "run_vp_mobile",
      capturedAt: "2026-06-24T10:00:00.000Z",
      pageUrl: "https://example.com/dashboard",
      consoleErrors: ["[Mobile] TypeError: undefined is not a function"],
    });

    expect(evidence.viewport).toBe("Mobile");
    expect(evidence.content).toBe("TypeError: undefined is not a function");
    expect(evidence.content).not.toContain("[Mobile]");
  });

  it("leaves viewport undefined for console errors without a prefix", () => {
    const [evidence] = transformRawEvidence({
      runId: "run_vp_plain",
      capturedAt: "2026-06-24T10:00:00.000Z",
      pageUrl: "https://example.com/dashboard",
      consoleErrors: ["Uncaught ReferenceError: x is not defined"],
    });

    expect(evidence.viewport).toBeUndefined();
    expect(evidence.content).toBe("Uncaught ReferenceError: x is not defined");
  });
});
