import "server-only";

/**
 * Fetch wrapper with AbortController-based timeout.
 *
 * All LLM providers share this exact pattern: set up an abort timer,
 * fetch with the abort signal, parse the response body, then clear the
 * timer in `finally`. The `parse` callback runs INSIDE the timed region
 * so a stalled body stream is aborted within timeoutMs — not left to
 * the OS TCP timeout. Extracting this here prevents four copies of the
 * same timeout bookkeeping and ensures cleanup is never skipped.
 *
 * Throws on non-2xx responses and network/abort errors — the caller
 * (generateAIReport) catches and falls back to generateMockReport.
 */
export async function fetchWithTimeout<T>(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  parse: (response: Response) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });

    if (!response.ok) {
      throw new Error(`Provider returned status ${response.status}`);
    }

    // Body read happens INSIDE the timed region so a stalled body
    // stream is aborted within timeoutMs, not left to the OS TCP timeout.
    return await parse(response);
  } finally {
    clearTimeout(timeoutId);
  }
}
