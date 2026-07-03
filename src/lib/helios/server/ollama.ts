import {
  AIFinding,
  AIReport,
  AIRiskLevel,
  LatestRun,
} from "@/lib/helios/shared/types";
import { validateAIReport } from "@/lib/helios/shared/validators";

export function generateMockReport(run: LatestRun): AIReport {
  const findings: AIFinding[] = [];
  const suggestedActions: string[] = [];

  const consoleEvIds =
    run.evidence?.filter((e) => e.type === "console").map((e) => e.id) || [];
  const networkEvIds =
    run.evidence?.filter((e) => e.type === "network").map((e) => e.id) || [];
  const imageEvIds =
    run.evidence?.filter((e) => e.type === "image").map((e) => e.id) || [];

  // Console errors check
  if (run.consoleErrors && run.consoleErrors.length > 0) {
    findings.push({
      title: `${run.consoleErrors.length} Console error(s) detected`,
      severity: "medium",
      evidenceIds: consoleEvIds,
      suggestedFix:
        "Check the runtime JavaScript exceptions in browser console logs.",
    });
    suggestedActions.push(
      "Inspect console logs for script crashes or exceptions.",
    );
  }

  // Failed requests check
  if (run.failedRequests && run.failedRequests.length > 0) {
    findings.push({
      title: `${run.failedRequests.length} Network request(s) failed`,
      severity: "medium",
      evidenceIds: networkEvIds,
      suggestedFix:
        "Verify the failing endpoint URL, CORS headers, or network connectivity.",
    });
    suggestedActions.push(
      "Debug the failed network requests in the network tab.",
    );
  }

  // Broken images check
  if (run.brokenImages && run.brokenImages.length > 0) {
    findings.push({
      title: `${run.brokenImages.length} Broken image(s) detected`,
      severity: "low",
      evidenceIds: imageEvIds,
      suggestedFix:
        "Verify if the image files exist on the server or the image source paths are correct.",
    });
    suggestedActions.push(
      "Update the broken image tags or upload missing image assets.",
    );
  }

  let riskLevel: AIRiskLevel = "low";
  let summary = `The QA run on ${run.startingUrl} completed successfully with no issues detected.`;

  if (run.status === "Failed") {
    riskLevel = "high";
    summary = `The QA run on ${run.startingUrl} failed to load or complete successfully.`;
    suggestedActions.push(
      "Verify the target website domain is online and reachable.",
    );
  } else if (findings.length > 0) {
    riskLevel = findings.some((f) => f.severity === "high") ? "high" : "medium";
    summary = `The page loaded successfully, but Helios detected ${findings.length} issue(s) that require developer attention.`;
  } else {
    suggestedActions.push("All clear, no immediate actions required.");
  }

  return {
    summary,
    riskLevel,
    findings,
    suggestedActions,
  };
}

export async function generateAIReport(run: LatestRun): Promise<AIReport> {
  const ollamaUrl = process.env.OLLAMA_HOST || "http://localhost:11434";
  const modelName = process.env.OLLAMA_MODEL || "llama3.2";

  let safeUrl = run.startingUrl;
  try {
    safeUrl = new URL(run.startingUrl).href;
  } catch {
    safeUrl = "Invalid URL";
  }

  const rawEvidence = run.evidence || [];
  const slicedEvidence = rawEvidence.slice(0, 25).map((e) => ({
    id: e.id,
    type: e.type,
    content: e.content,
  }));

  const systemPrompt = `You are an AI QA Analyst checking a website run report.
Analyze the following QA run data:
URL: ${safeUrl}
Status: ${run.status}
Checks: ${JSON.stringify(run.checks)}
Evidence: ${JSON.stringify(slicedEvidence)}
Generate a structured QA analysis report in JSON format matching this schema:
{
  "summary": "Concise summary sentence explaining the overall status and problems",
  "riskLevel": "low" | "medium" | "high",
  "findings": [
    {
      "title": "Short descriptive title of the issue",
      "severity": "low" | "medium" | "high",
      "evidenceIds": ["List of evidence IDs that support this finding"],
      "suggestedFix": "Concrete fix instruction"
    }
  ],
  "suggestedActions": [
    "Immediate developer next actions"
  ]
}
Only output the JSON object. Do not include markdown formatting or wrapping.`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modelName,
        prompt: systemPrompt,
        format: "json",
        stream: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Ollama returned status ${response.status}`);
    }

    const data = await response.json();
    const parsedText =
      typeof data.response === "string" ? data.response.trim() : "";
    const parsedJson = JSON.parse(parsedText);

    const validated = validateAIReport(parsedJson);
    if (validated) return validated;

    throw new Error("Ollama output failed schema validation");
  } catch (error) {
    console.warn(
      `Ollama LLM generation unavailable (${(error as Error).message}). Falling back to rule-based mock report.`,
    );
    return generateMockReport(run);
  }
}
