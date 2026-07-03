import {
  AI_RISK_LEVELS,
  type AIRiskLevel,
  type AIReport,
  AIFinding,
} from "@/lib/helios/shared/types";

export function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateAIReport(data: unknown): AIReport | null {
  if (typeof data !== "object" || data === null) return null;

  const obj = data as Record<string, unknown>;

  if (typeof obj.summary !== "string") return null;

  if (
    typeof obj.riskLevel !== "string" ||
    !AI_RISK_LEVELS.includes(obj.riskLevel as AIRiskLevel)
  ) {
    return null;
  }

  if (!Array.isArray(obj.findings)) return null;
  const validatedFindings: AIFinding[] = [];

  for (const f of obj.findings) {
    if (typeof f !== "object" || f === null) return null;

    const findingObj = f as Record<string, unknown>;
    if (typeof findingObj.title !== "string") return null;
    if (
      typeof findingObj.severity !== "string" ||
      !AI_RISK_LEVELS.includes(findingObj.severity as AIRiskLevel)
    ) {
      return null;
    }
    if (
      !Array.isArray(findingObj.evidenceIds) ||
      !findingObj.evidenceIds.every((id) => typeof id === "string")
    ) {
      return null;
    }

    if (
      findingObj.suggestedFix !== undefined &&
      typeof findingObj.suggestedFix !== "string"
    ) {
      return null;
    }

    validatedFindings.push({
      title: findingObj.title,
      severity: findingObj.severity as AIRiskLevel,
      evidenceIds: findingObj.evidenceIds as string[],
      suggestedFix: findingObj.suggestedFix,
    });
  }

  if (
    !Array.isArray(obj.suggestedActions) ||
    !obj.suggestedActions.every((a) => typeof a === "string")
  ) {
    return null;
  }

  return {
    summary: obj.summary,
    riskLevel: obj.riskLevel as AIRiskLevel,
    findings: validatedFindings,
    suggestedActions: obj.suggestedActions as string[],
  };
}
