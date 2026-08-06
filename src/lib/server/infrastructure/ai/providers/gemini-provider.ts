import "server-only";
import { fetchWithTimeout } from "@/lib/server/infrastructure/utils/fetch-with-timeout";
import type { AIProviderConfig } from "@/lib/server/infrastructure/ai/ai-config";
import type { LLMProvider } from "@/lib/server/infrastructure/ai/ai-provider";

/**
 * Native Gemini provider — calls :generateContent with the API key
 * as a query parameter (not a header). The model name is embedded in
 * the URL path. Response is extracted from candidates[0].content.parts[0].text.
 */
export class GeminiProvider implements LLMProvider {
  constructor(private readonly config: AIProviderConfig) {}

  async generateReport(prompt: string, timeoutMs: number): Promise<string> {
    if (!this.config.apiKey) {
      throw new Error("Gemini provider requires AI_API_KEY");
    }

    const url = `${this.config.baseUrl}/v1beta/models/${this.config.model}:generateContent?key=${this.config.apiKey}`;

    const data = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        }),
      },
      timeoutMs,
      (response) => response.json(),
    );

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";

    if (!text) {
      throw new Error("Gemini provider returned empty response");
    }

    return text;
  }
}
