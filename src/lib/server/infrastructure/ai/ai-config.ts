import "server-only";

export type AIProviderType = "ollama" | "openai" | "anthropic" | "gemini";

export type AIProviderConfig = {
  provider: AIProviderType;
  baseUrl: string;
  apiKey: string | undefined;
  model: string;
  timeout: number;
};

const CLOUD_DEFAULT_TIMEOUT = 60000;
const OLLAMA_DEFAULT_TIMEOUT = 30000;
const OLLAMA_DEFAULT_HOST = "http://localhost:11434";
const OLLAMA_DEFAULT_MODEL = "llama3.2";

function parseTimeout(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const parsed = parseInt(raw, 10);
  if (isNaN(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function resolveProvider(raw: string | undefined): AIProviderType {
  const provider = (raw ?? "ollama").toLowerCase();
  if (
    provider === "ollama" ||
    provider === "openai" ||
    provider === "anthropic" ||
    provider === "gemini"
  ) {
    return provider;
  }
  // Unknown value — return as-is so createProvider throws and
  // generateAIReport falls back to generateMockReport.
  return provider as AIProviderType;
}

/**
 * Resolves AI provider configuration from environment variables.
 *
 * Precedence (Ollama backward compat):
 *   AI_PROVIDER defaults to "ollama"
 *   AI_BASE_URL falls back to OLLAMA_HOST for ollama
 *   AI_MODEL falls back to OLLAMA_MODEL for ollama
 *   AI_TIMEOUT falls back to OLLAMA_TIMEOUT for ollama
 *
 * For cloud providers (openai, anthropic, gemini):
 *   baseUrl, model, apiKey have no Ollama fallback
 *   timeout defaults to 60000ms
 */
export function resolveAIConfig(): AIProviderConfig {
  const provider = resolveProvider(process.env.AI_PROVIDER);
  const isOllama = provider === "ollama";

  const baseUrl =
    process.env.AI_BASE_URL ??
    (isOllama ? (process.env.OLLAMA_HOST ?? OLLAMA_DEFAULT_HOST) : "");

  if (baseUrl) {
    const parsed = new URL(baseUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error(
        `AI_BASE_URL must use http or https protocol, got ${parsed.protocol}`,
      );
    }
  }

  const apiKey = process.env.AI_API_KEY;

  const model =
    process.env.AI_MODEL ??
    (isOllama ? (process.env.OLLAMA_MODEL ?? OLLAMA_DEFAULT_MODEL) : "");

  const fallbackTimeout = isOllama
    ? OLLAMA_DEFAULT_TIMEOUT
    : CLOUD_DEFAULT_TIMEOUT;
  const timeout = parseTimeout(
    process.env.AI_TIMEOUT ??
      (isOllama ? process.env.OLLAMA_TIMEOUT : undefined),
    fallbackTimeout,
  );

  return { provider, baseUrl, apiKey, model, timeout };
}

/**
 * Redacts API keys from URL strings for safe logging.
 * Gemini embeds the key as a query parameter (?key=xxx), so error
 * messages containing the fetch URL would leak the key without this.
 */
export function redactApiKey(url: string): string {
  return url.replace(/key=[^&]+/gi, "key=REDACTED");
}
