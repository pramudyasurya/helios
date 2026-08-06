import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { generateAIReport } from "@/lib/server/infrastructure/ai/report-generator";
import type { LatestRun } from "@/lib/shared/domain/types";

const validReportJson = JSON.stringify({
  summary: "No critical issues found.",
  riskLevel: "low",
  findings: [],
  suggestedActions: ["Review console errors."],
});

const mockRun: LatestRun = {
  id: "run-123",
  startingUrl: "https://example.com",
  status: "Completed",
  trail: [],
  summary: "Loaded",
  checks: [],
  createdAt: new Date().toISOString(),
};

function mockFetchResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  } as Response;
}

const originalFetch = globalThis.fetch;

function restoreEnv(keys: string[]) {
  keys.forEach((key) => {
    delete (process.env as Record<string, string>)[key];
  });
}

function setEnv(vars: Record<string, string>) {
  Object.entries(vars).forEach(([key, value]) => {
    process.env[key] = value;
  });
}

describe("Provider: Ollama (backward compat)", () => {
  beforeEach(() => {
    restoreEnv([
      "AI_PROVIDER",
      "AI_BASE_URL",
      "AI_API_KEY",
      "AI_MODEL",
      "AI_TIMEOUT",
      "OLLAMA_HOST",
      "OLLAMA_MODEL",
      "OLLAMA_TIMEOUT",
    ]);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("calls /api/generate with model, prompt, format=json, stream=false", async () => {
    process.env.AI_PROVIDER = "ollama";
    process.env.OLLAMA_HOST = "http://localhost:11434";
    process.env.OLLAMA_MODEL = "llama3.2";

    const fetchSpy = vi.fn().mockResolvedValue(
      mockFetchResponse({ response: validReportJson }),
    );
    globalThis.fetch = fetchSpy;

    const report = await generateAIReport(mockRun);
    expect(report.riskLevel).toBe("low");

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("http://localhost:11434/api/generate");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.model).toBe("llama3.2");
    expect(body.format).toBe("json");
    expect(body.stream).toBe(false);
    expect(body.prompt).toContain("AI QA Analyst");
  });

  it("defaults to localhost:11434 and llama3.2 when no env vars are set", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      mockFetchResponse({ response: validReportJson }),
    );
    globalThis.fetch = fetchSpy;

    await generateAIReport(mockRun);
    const [url] = fetchSpy.mock.calls[0];
    expect(url).toContain("localhost:11434");
  });
});

describe("Provider: OpenAI-compatible", () => {
  beforeEach(() => {
    restoreEnv([
      "AI_PROVIDER",
      "AI_BASE_URL",
      "AI_API_KEY",
      "AI_MODEL",
      "AI_TIMEOUT",
      "OLLAMA_HOST",
      "OLLAMA_MODEL",
      "OLLAMA_TIMEOUT",
    ]);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("calls /chat/completions with Bearer auth and messages array", async () => {
    process.env.AI_PROVIDER = "openai";
    process.env.AI_BASE_URL = "https://api.openai.com/v1";
    process.env.AI_API_KEY = "sk-test-key";
    process.env.AI_MODEL = "gpt-4o-mini";

    const fetchSpy = vi.fn().mockResolvedValue(
      mockFetchResponse({
        choices: [{ message: { content: validReportJson } }],
      }),
    );
    globalThis.fetch = fetchSpy;

    const report = await generateAIReport(mockRun);
    expect(report.riskLevel).toBe("low");

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/chat/completions");
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer sk-test-key");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.model).toBe("gpt-4o-mini");
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0].role).toBe("system");
    expect(body.stream).toBe(false);
  });

  it("works without Authorization header when API key is not set (LM Studio)", async () => {
    process.env.AI_PROVIDER = "openai";
    process.env.AI_BASE_URL = "http://localhost:1234/v1";
    process.env.AI_MODEL = "local-model";

    const fetchSpy = vi.fn().mockResolvedValue(
      mockFetchResponse({
        choices: [{ message: { content: validReportJson } }],
      }),
    );
    globalThis.fetch = fetchSpy;

    const report = await generateAIReport(mockRun);
    expect(report.riskLevel).toBe("low");

    const [, init] = fetchSpy.mock.calls[0];
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers["Authorization"]).toBeUndefined();
  });

  it("supports non-OpenAI base URLs (Groq)", async () => {
    process.env.AI_PROVIDER = "openai";
    process.env.AI_BASE_URL = "https://api.groq.com/openai/v1";
    process.env.AI_API_KEY = "gsk-test";
    process.env.AI_MODEL = "llama-3.3-70b-versatile";

    const fetchSpy = vi.fn().mockResolvedValue(
      mockFetchResponse({
        choices: [{ message: { content: validReportJson } }],
      }),
    );
    globalThis.fetch = fetchSpy;

    await generateAIReport(mockRun);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://api.groq.com/openai/v1/chat/completions");
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer gsk-test");
  });

  it("falls back to mock report on non-2xx response", async () => {
    process.env.AI_PROVIDER = "openai";
    process.env.AI_BASE_URL = "https://api.openai.com/v1";
    process.env.AI_API_KEY = "sk-bad";

    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401 });

    const report = await generateAIReport(mockRun);
    expect(report).toBeDefined();
    expect(report.riskLevel).toBe("low");
    expect(report.summary).toContain("completed successfully");
  });
});

describe("Provider: Anthropic", () => {
  beforeEach(() => {
    restoreEnv([
      "AI_PROVIDER",
      "AI_BASE_URL",
      "AI_API_KEY",
      "AI_MODEL",
      "AI_TIMEOUT",
      "OLLAMA_HOST",
      "OLLAMA_MODEL",
      "OLLAMA_TIMEOUT",
    ]);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("calls /v1/messages with x-api-key and anthropic-version headers", async () => {
    process.env.AI_PROVIDER = "anthropic";
    process.env.AI_BASE_URL = "https://api.anthropic.com";
    process.env.AI_API_KEY = "sk-ant-test";
    process.env.AI_MODEL = "claude-3.5-sonnet";

    const fetchSpy = vi.fn().mockResolvedValue(
      mockFetchResponse({ content: [{ text: validReportJson }] }),
    );
    globalThis.fetch = fetchSpy;

    const report = await generateAIReport(mockRun);
    expect(report.riskLevel).toBe("low");

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe("sk-ant-test");
    expect(headers["anthropic-version"]).toBe("2023-06-01");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.model).toBe("claude-3.5-sonnet");
    expect(body.max_tokens).toBe(4096);
    expect(body.system).toContain("AI QA Analyst");
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0].role).toBe("user");
  });

  it("falls back to mock when API key is missing", async () => {
    process.env.AI_PROVIDER = "anthropic";
    process.env.AI_BASE_URL = "https://api.anthropic.com";
    process.env.AI_MODEL = "claude-3.5-sonnet";
    // No AI_API_KEY set

    globalThis.fetch = vi.fn();

    const report = await generateAIReport(mockRun);
    expect(report).toBeDefined();
    expect(report.riskLevel).toBe("low");
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});

describe("Provider: Gemini", () => {
  beforeEach(() => {
    restoreEnv([
      "AI_PROVIDER",
      "AI_BASE_URL",
      "AI_API_KEY",
      "AI_MODEL",
      "AI_TIMEOUT",
      "OLLAMA_HOST",
      "OLLAMA_MODEL",
      "OLLAMA_TIMEOUT",
    ]);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("calls :generateContent with model in path and key as query param", async () => {
    process.env.AI_PROVIDER = "gemini";
    process.env.AI_BASE_URL = "https://generativelanguage.googleapis.com";
    process.env.AI_API_KEY = "gem-test-key";
    process.env.AI_MODEL = "gemini-1.5-flash";

    const fetchSpy = vi.fn().mockResolvedValue(
      mockFetchResponse({
        candidates: [
          { content: { parts: [{ text: validReportJson }] } },
        ],
      }),
    );
    globalThis.fetch = fetchSpy;

    const report = await generateAIReport(mockRun);
    expect(report.riskLevel).toBe("low");

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toContain(
      "/v1beta/models/gemini-1.5-flash:generateContent",
    );
    expect(url).toContain("key=gem-test-key");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.contents).toHaveLength(1);
    expect(body.contents[0].role).toBe("user");
    expect(body.contents[0].parts[0].text).toContain("AI QA Analyst");
  });

  it("falls back to mock when API key is missing", async () => {
    process.env.AI_PROVIDER = "gemini";
    process.env.AI_BASE_URL = "https://generativelanguage.googleapis.com";
    process.env.AI_MODEL = "gemini-1.5-flash";
    // No AI_API_KEY set

    globalThis.fetch = vi.fn();

    const report = await generateAIReport(mockRun);
    expect(report).toBeDefined();
    expect(report.riskLevel).toBe("low");
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});

describe("Edge cases", () => {
  beforeEach(() => {
    restoreEnv([
      "AI_PROVIDER",
      "AI_BASE_URL",
      "AI_API_KEY",
      "AI_MODEL",
      "AI_TIMEOUT",
      "OLLAMA_HOST",
      "OLLAMA_MODEL",
      "OLLAMA_TIMEOUT",
    ]);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("falls back to mock for unknown AI_PROVIDER value", async () => {
    process.env.AI_PROVIDER = "unknown-provider";

    globalThis.fetch = vi.fn();

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const report = await generateAIReport(mockRun);
    expect(report).toBeDefined();
    expect(report.riskLevel).toBe("low");
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it("redacts API key from Gemini error logs", async () => {
    process.env.AI_PROVIDER = "gemini";
    process.env.AI_BASE_URL = "http://localhost:9999";
    process.env.AI_API_KEY = "secret-key-123";
    process.env.AI_MODEL = "gemini-1.5-flash";

    globalThis.fetch = vi.fn().mockRejectedValue(
      new Error(
        "fetch failed for http://localhost:9999/v1beta/models/gemini-1.5-flash:generateContent?key=secret-key-123",
      ),
    );

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await generateAIReport(mockRun);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    const warnMessage = warnSpy.mock.calls[0][0] as string;
    expect(warnMessage).not.toContain("secret-key-123");
    expect(warnMessage).toContain("key=REDACTED");

  });

  it("uses default timeout when AI_TIMEOUT is invalid", async () => {
    process.env.AI_PROVIDER = "openai";
    process.env.AI_BASE_URL = "https://api.openai.com/v1";
    process.env.AI_API_KEY = "sk-test";
    process.env.AI_MODEL = "gpt-4o-mini";
    process.env.AI_TIMEOUT = "abc";

    const fetchSpy = vi.fn().mockResolvedValue(
      mockFetchResponse({
        choices: [{ message: { content: validReportJson } }],
      }),
    );
    globalThis.fetch = fetchSpy;

    // Should still work — invalid timeout falls back to 60000ms default
    const report = await generateAIReport(mockRun);
    expect(report.riskLevel).toBe("low");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("falls back to mock when JSON is valid but fails schema validation", async () => {
    // Well-formed JSON that does NOT match AIReportSchema — exercises the
    // validateAIReport trust boundary, not the JSON.parse path.
    process.env.AI_PROVIDER = "openai";
    process.env.AI_BASE_URL = "https://api.openai.com/v1";
    process.env.AI_API_KEY = "sk-test";
    process.env.AI_MODEL = "gpt-4o-mini";

    globalThis.fetch = vi.fn().mockResolvedValue(
      mockFetchResponse({
        choices: [{ message: { content: JSON.stringify({ foo: "bar" }) } }],
      }),
    );

    const report = await generateAIReport(mockRun);
    expect(report).toBeDefined();
    expect(report.riskLevel).toBe("low");
    expect(report.summary).toContain("completed successfully");
  });

  it("falls back to mock when provider returns malformed JSON", async () => {
    process.env.AI_PROVIDER = "openai";
    process.env.AI_BASE_URL = "https://api.openai.com/v1";
    process.env.AI_API_KEY = "sk-test";
    process.env.AI_MODEL = "gpt-4o-mini";

    globalThis.fetch = vi.fn().mockResolvedValue(
      mockFetchResponse({
        choices: [{ message: { content: "not valid json" } }],
      }),
    );

    const report = await generateAIReport(mockRun);
    expect(report).toBeDefined();
    expect(report.riskLevel).toBe("low");
    expect(report.summary).toContain("completed successfully");
  });
});
