import type { EvidenceType, RunEvidence } from "@/lib/shared/domain/types";

type TransformRawEvidenceInput = {
  runId: string;
  capturedAt: string;
  pageUrl: string;
  brokenImages?: string[];
  consoleErrors?: string[];
  failedRequests?: string[];
};

export function tryExtractUrl(text: string): string | undefined {
  const match = text.match(/https?:\/\/[^\s"'<>]+/);

  if (!match) return undefined;

  try {
    return new URL(match[0]).toString();
  } catch {
    return undefined;
  }
}

export function extractViewport(rawContent: string): {
  viewport?: string;
  content: string;
} {
  const match = rawContent.match(/^\[(Desktop|Mobile)\]\s+([\s\S]*)$/);

  if (!match) return { viewport: undefined, content: rawContent };

  return { viewport: match[1], content: match[2] };
}

function toRunEvidence(
  runId: string,
  type: EvidenceType,
  items: string[],
  capturedAt: string,
  pageUrl: string,
): RunEvidence[] {
  return items.map((content, index) => {
    const { viewport, content: stripped } = extractViewport(content);

    return {
      id: `${runId}:${type}:${index}`,
      type,
      content: stripped,
      pageUrl,
      resourceUrl: tryExtractUrl(stripped),
      viewport,
      capturedAt,
      status: "open",
    };
  });
}

/**
 * @deprecated Legacy fallback for runs persisted before the Evidence table.
 * Synthesizes IDs as runId:type:index — display-only, status PATCH will 404 on synthetic IDs.
 * Remove once all legacy runs are migrated/expired.
 */
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
