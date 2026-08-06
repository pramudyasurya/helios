import "server-only";
import type { AIProviderConfig } from "@/lib/server/infrastructure/ai/ai-config";
import { OllamaProvider } from "@/lib/server/infrastructure/ai/providers/ollama-provider";
import { OpenAICompatProvider } from "@/lib/server/infrastructure/ai/providers/openai-compat-provider";
import { AnthropicProvider } from "@/lib/server/infrastructure/ai/providers/anthropic-provider";
import { GeminiProvider } from "@/lib/server/infrastructure/ai/providers/gemini-provider";

export interface LLMProvider {
  /**
   * Sends the prompt to the LLM and returns the raw text response
   * containing JSON that conforms to AIReportSchema.
   *
   * Throws on any failure (network, timeout, non-2xx, malformed response).
   * The caller (generateAIReport) catches all errors and falls back
   * to generateMockReport.
   */
  generateReport(prompt: string, timeoutMs: number): Promise<string>;
}

/**
 * Factory that returns the provider matching config.provider.
 * Throws on unknown providers — caught by generateAIReport, which
 * falls back to generateMockReport.
 */
export function createProvider(config: AIProviderConfig): LLMProvider {
  switch (config.provider) {
    case "ollama":
      return new OllamaProvider(config);
    case "openai":
      return new OpenAICompatProvider(config);
    case "anthropic":
      return new AnthropicProvider(config);
    case "gemini":
      return new GeminiProvider(config);
    default:
      throw new Error(`Unknown AI provider: ${config.provider}`);
  }
}
