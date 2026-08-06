import "server-only";
import { fetchWithTimeout } from "@/lib/server/infrastructure/utils/fetch-with-timeout";
import type { AIProviderConfig } from "@/lib/server/infrastructure/ai/ai-config";
import type { LLMProvider, LLMResponse } from "@/lib/server/infrastructure/ai/ai-provider";

/**
 * OpenAI-compatible provider — works with OpenAI, Groq, Together,
 * vLLM, LM Studio, LiteLLM, OpenRouter, and any provider that exposes
 * /v1/chat/completions. Auth is via Bearer token (omitted if no key).
 */
export class OpenAICompatProvider implements LLMProvider {
  constructor(private readonly config: AIProviderConfig) {}

  async generateReport(prompt: string, timeoutMs: number): Promise<LLMResponse> {
    const url = `${this.config.baseUrl}/chat/completions`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.config.apiKey) {
      headers["Authorization"] = `Bearer ${this.config.apiKey}`;
    }

    const data = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            { role: "system", content: prompt },
            { role: "user", content: "Generate the report." },
          ],
          stream: false,
        }),
      },
      timeoutMs,
      (response) => response.json(),
    );

    const message = data.choices?.[0]?.message;
    const text = message?.content?.trim() ?? "";

    if (!text) {
      throw new Error("OpenAI-compatible provider returned empty response");
    }

    // Capture reasoning/thinking tokens from models that provide them
    // (e.g. GLM 5.2 returns reasoning_content alongside content).
    const reasoningContent = message?.reasoning_content?.trim() || undefined;

    return { content: text, reasoningContent };
  }
}
