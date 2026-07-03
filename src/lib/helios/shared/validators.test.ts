import { describe, expect, it } from "vitest";
import {
  isValidHttpUrl,
  validateAIReport,
} from "@/lib/helios/shared/validators";

describe("isValidHttpUrl", () => {
  it("accepts http and https URL", () => {
    expect(isValidHttpUrl("http://www.example.com")).toBe(true);
    expect(isValidHttpUrl("https://www.example.com")).toBe(true);
  });

  it("rejects invalid URLs", () => {
    expect(isValidHttpUrl("zzz.example.com")).toBe(false);
  });

  it("rejects non-http protocol", () => {
    expect(isValidHttpUrl("ftp://example.com")).toBe(false);
  });
});

describe("validateAIReport", () => {
  it("accepts a perfectly structured AI report payload", () => {
    const validReport = {
      summary: "Run completed with minor issues.",
      riskLevel: "medium",
      findings: [
        {
          title: "Console error detected",
          severity: "medium",
          evidenceIds: ["ev-123"],
          suggestedFix: "Check runtime exception.",
        },
      ],
      suggestedActions: ["Inspect console logs"],
    };

    const validated = validateAIReport(validReport);
    expect(validated).not.toBeNull();
    expect(validated?.riskLevel).toBe("medium");
    expect(validated?.findings[0].evidenceIds).toEqual(["ev-123"]);
  });

  it("rejects invalid risk levels", () => {
    const invalidReport = {
      summary: "Invalid risk level test.",
      riskLevel: "very-high",
      findings: [],
      suggestedActions: [],
    };

    expect(validateAIReport(invalidReport)).toBeNull();
  });

  it("rejects missing mandatory fields", () => {
    const incompleteReport = {
      summary: "Missing findings test",
    };

    expect(validateAIReport(incompleteReport)).toBeNull();
  });
});
