import { transformRawEvidence } from "@/lib/shared/domain/evidence-transformer";
import { runRecordToLatestRun } from "@/lib/server/infrastructure/runner/run-record";
import { describe, expect, it } from "vitest";

type RunInput = Parameters<typeof runRecordToLatestRun>[0];

function makeBaseRun(): RunInput {
  return {
    id: "run-1",
    startingUrl: "https://example.com",
    status: "Completed",
    summary: "Helios completed QA for 1 page(s).",
    createdAt: new Date("2026-08-01T10:00:00.000Z"),
    finishedAt: new Date("2026-08-01T10:00:05.000Z"),
    durationMs: 5000,
    finalUrl: "https://example.com/final",
    title: "Example Page",
    description: "A test page",
    trail: [
      { label: "Start", detail: "Crawl began", timestamp: "2026-08-01T10:00:00.000Z" },
    ],
    checks: [],
    artifacts: null,
    report: null,
    brokenImages: [],
    consoleErrors: [],
    failedRequests: [],
    loadMetrics: null,
    environmentId: null,
    origin: "manual",
    updatedAt: new Date("2026-08-01T10:00:05.000Z"),
  } as unknown as RunInput;
}

const pageResults = [
  {
    id: "770e8400-e29b-41d4-a716-446655440000",
    runId: "run-1",
    url: "https://example.com/page",
    depth: 0,
    status: "Completed",
    statusCode: 200,
    finalUrl: "https://example.com/page",
    title: "Example",
    description: null,
    durationMs: 1000,
    artifacts: null,
    brokenImages: null,
    consoleErrors: null,
    failedRequests: null,
    loadMetrics: null,
    checks: null,
    createdAt: new Date("2026-08-01T10:00:02.000Z"),
    updatedAt: new Date("2026-08-01T10:00:02.000Z"),
  },
];

const environment = {
  name: "Production",
  project: { name: "Helios" },
};

describe("runRecordToLatestRun", () => {
  it("maps persisted evidence rows from the database, preserving UUIDs, severity, and viewport", () => {
    const evidenceRows = [
      {
        id: "550e8400-e29b-41d4-a716-446655440000",
        runId: "run-1",
        pageResultId: null,
        type: "console" as const,
        content: "Uncaught TypeError: Cannot read property 'x' of undefined",
        pageUrl: "https://example.com/page",
        resourceUrl: null,
        status: "open" as const,
        severity: "high",
        viewport: "Desktop",
        createdAt: new Date("2026-08-01T10:00:03.000Z"),
        updatedAt: new Date("2026-08-01T10:00:03.000Z"),
      },
      {
        id: "660e8400-e29b-41d4-a716-446655440001",
        runId: "run-1",
        pageResultId: null,
        type: "image" as const,
        content: "missing-image.png",
        pageUrl: "https://example.com/page",
        resourceUrl: "https://example.com/missing-image.png",
        status: "open" as const,
        severity: "medium",
        viewport: "Mobile",
        createdAt: new Date("2026-08-01T10:00:04.000Z"),
        updatedAt: new Date("2026-08-01T10:00:04.000Z"),
      },
    ];

    const result = runRecordToLatestRun({
      ...makeBaseRun(),
      evidence: evidenceRows,
      pageResults,
      environment,
    } as RunInput);

    expect(result.id).toBe("run-1");
    expect(result.status).toBe("Completed");
    expect(result.projectName).toBe("Helios");
    expect(result.environmentName).toBe("Production");
    expect(result.origin).toBe("manual");

    expect(result.evidence).toHaveLength(2);
    expect(result.evidence![0]).toEqual({
      id: "550e8400-e29b-41d4-a716-446655440000",
      type: "console",
      content: "Uncaught TypeError: Cannot read property 'x' of undefined",
      pageUrl: "https://example.com/page",
      resourceUrl: undefined,
      status: "open",
      severity: "high",
      viewport: "Desktop",
      capturedAt: "2026-08-01T10:00:03.000Z",
    });
    expect(result.evidence![1]).toEqual({
      id: "660e8400-e29b-41d4-a716-446655440001",
      type: "image",
      content: "missing-image.png",
      pageUrl: "https://example.com/page",
      resourceUrl: "https://example.com/missing-image.png",
      status: "open",
      severity: "medium",
      viewport: "Mobile",
      capturedAt: "2026-08-01T10:00:04.000Z",
    });

    expect(result.pageResults).toHaveLength(1);
    expect(result.pageResults![0].url).toBe("https://example.com/page");
  });

  it("synthesizes evidence from legacy JSON arrays when no evidence rows exist (fallback)", () => {
    const brokenImages = ["broken-1.png", "broken-2.png"];
    const consoleErrors = [
      "TypeError: x is undefined",
      "[Mobile] ReferenceError: y is not defined",
    ];
    const failedRequests = ["GET https://example.com/api/failed 500"];

    const result = runRecordToLatestRun({
      ...makeBaseRun(),
      evidence: [],
      brokenImages,
      consoleErrors,
      failedRequests,
      pageResults,
      environment,
    } as RunInput);

    // Fallback produces the same output as transformRawEvidence directly.
    const expected = transformRawEvidence({
      runId: "run-1",
      capturedAt: "2026-08-01T10:00:05.000Z",
      pageUrl: "https://example.com/final",
      brokenImages,
      consoleErrors,
      failedRequests,
    });

    expect(result.evidence).toEqual(expected);

    // 2 image + 2 console + 1 network = 5 synthesized items.
    expect(result.evidence).toHaveLength(5);

    // Synthesized IDs follow the runId:type:index pattern (fake IDs).
    expect(result.evidence![0].id).toBe("run-1:image:0");
    expect(result.evidence![0].type).toBe("image");
    expect(result.evidence![0].content).toBe("broken-1.png");
    expect(result.evidence![1].id).toBe("run-1:image:1");

    // The [Mobile] viewport prefix is stripped and viewport is set.
    expect(result.evidence![2].id).toBe("run-1:console:0");
    expect(result.evidence![2].viewport).toBeUndefined();
    expect(result.evidence![3].id).toBe("run-1:console:1");
    expect(result.evidence![3].viewport).toBe("Mobile");
    expect(result.evidence![3].content).toBe("ReferenceError: y is not defined");

    // Network evidence extracts the resource URL from the message.
    expect(result.evidence![4].id).toBe("run-1:network:0");
    expect(result.evidence![4].type).toBe("network");
    expect(result.evidence![4].resourceUrl).toBe(
      "https://example.com/api/failed",
    );

    // Fallback capturedAt derives from finishedAt; pageUrl from finalUrl.
    expect(result.evidence![0].capturedAt).toBe("2026-08-01T10:00:05.000Z");
    expect(result.evidence![0].pageUrl).toBe("https://example.com/final");
  });
});
