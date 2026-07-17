import type { EvidenceType, RunEvidence } from "@/lib/shared/domain/types";

type TransformRawEvidenceInput = {
  runId: string;
  capturedAt: string;
  pageUrl: string;
  brokenImages?: string[];
  consoleErrors?: string[];
  failedRequests?: string[];
};

function tryExtractUrl(text: string): string | undefined {
  const match = text.match(/https?:\/\/[^\s"'<>]+/);

  if (!match) return undefined;

  try {
    return new URL(match[0]).toString();
  } catch {
    return undefined;
  }
}

function toRunEvidence(
  runId: string,
  type: EvidenceType,
  items: string[],
  capturedAt: string,
  pageUrl: string,
): RunEvidence[] {
  return items.map((content, index) => ({
    id: `${runId}:${type}:${index}`,
    type,
    content,
    pageUrl,
    resourceUrl: tryExtractUrl(content),
    capturedAt,
    status: "open",
  }));
}

export function transformRawEvidence({
  runId,
  capturedAt,
  pageUrl,
  brokenImages = [],
  consoleErrors = [],
  failedRequests = [],
}: TransformRawEvidenceInput): RunEvidence[] {
  return [
    ...toRunEvidence(runId, "image", brokenImages, capturedAt, pageUrl),
    ...toRunEvidence(runId, "console", consoleErrors, capturedAt, pageUrl),
    ...toRunEvidence(runId, "network", failedRequests, capturedAt, pageUrl),
  ];
}
