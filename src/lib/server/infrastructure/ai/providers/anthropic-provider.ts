import "server-only";
import { fetchWithTimeout } from "@/lib/server/infrastructure/utils/fetch-with-timeout";
import type { AIProviderConfig } from "@/lib/server/infrastructure/ai/ai-config";
import type { LLMProvider } from "@/lib/server/infrastructure/ai/ai-provider";

const ANTHROPIC_VERSION = "2023-06-01";

/**
 * Native Anthropic provider — calls /v1/messages with x-api-key
 * and anthropic-version headers. Unlike OpenAI, the system prompt
 * is a top-level field (not a message), and max_tokens is required.
 */
export class AnthropicProvider implements LLMProvider {
  constructor(private readonly config: AIProviderConfig) {}

  async generateReport(prompt: string, timeoutMs: number): Promise<string> {
    if (!this.config.apiKey) {
      throw new Error("Anthropic provider requires AI_API_KEY");
    }

    const url = `${this.config.baseUrl}/v1/messages`;

    const data = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.config.apiKey,
          "anthropic-version": ANTHROPIC_VERSION,
        },
        body: JSON.stringify({
          model: this.config.model,
          max_tokens: 4096,
          system: prompt,
          messages: [{ role: "user", content: "Generate the report." }],
        }),
      },
      timeoutMs,
      (response) => response.json(),
    );

    const text = data.content?.[0]?.text?.trim() ?? "";

    if (!text) {
      throw new Error("Anthropic provider returned empty response");
    }

    return text;
  }
}
