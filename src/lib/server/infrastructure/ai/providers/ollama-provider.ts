import "server-only";
import type { AIProviderConfig } from "@/lib/server/infrastructure/ai/ai-config";
import type { LLMProvider, LLMResponse } from "@/lib/server/infrastructure/ai/ai-provider";
import { fetchWithTimeout } from "@/lib/server/infrastructure/utils/fetch-with-timeout";

/**
 * Native Ollama provider — calls /api/generate with a raw prompt
 * and JSON format. This is the default, zero-config provider.
 */
export class OllamaProvider implements LLMProvider {
  constructor(private readonly config: AIProviderConfig) {}

  async generateReport(prompt: string, timeoutMs: number): Promise<LLMResponse> {
    const url = `${this.config.baseUrl}/api/generate`;

    const data = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.config.model,
          prompt,
          format: "json",
          stream: false,
        }),
      },
      timeoutMs,
      (response) => response.json(),
    );

    const text = typeof data.response === "string" ? data.response.trim() : "";

    if (!text) {
      throw new Error("Ollama returned empty response");
    }

    return { content: text };
  }
}
