import { describe, expect, it } from "vitest";
import {
  CreateRunSchema,
  GetRunsQuerySchema,
  isValidHttpUrl,
  UpdateEvidenceStatusSchema,
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

describe("CreateRunSchema (SSRF Protection)", () => {
  it("accepts valid external public URLs", () => {
    const valid = CreateRunSchema.safeParse({ url: "https://github.com" });

    expect(valid.success).toBe(true);
  });

  it("rejects localhost", () => {
    const testLocalhost = CreateRunSchema.safeParse({
      url: "http://localhost:3000",
    });
    const testLocalhostName = CreateRunSchema.safeParse({
      url: "http//localhost",
    });
    const testLoopbackIp = CreateRunSchema.safeParse({
      url: "http://127.0.0.1",
    });

    expect(testLocalhost.success).toBe(false);
    expect(testLocalhostName.success).toBe(false);
    expect(testLoopbackIp.success).toBe(false);
  });

  it("rejects cloud metadata and private intranet IPs", () => {
    const testAwsMetadata = CreateRunSchema.safeParse({
      url: "http://169.254.169.254",
    });
    const testPrivateIpClassA = CreateRunSchema.safeParse({
      url: "http://10.0.0.1",
    });
    const testPrivateIpClassC = CreateRunSchema.safeParse({
      url: "http://192.168.1.1",
    });

    expect(testAwsMetadata.success).toBe(false);
    expect(testPrivateIpClassA.success).toBe(false);
    expect(testPrivateIpClassC.success).toBe(false);
  });
});

describe("GetRunsQuerySchema", () => {
  it("coerces page and limit strings to numbers and applies defaults", () => {
    const result = GetRunsQuerySchema.safeParse({
      page: "2",
      limit: "15",
    });

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(15);
      expect(result.data.q).toBe("");
    }
  });

  it("rejects invalid status", () => {
    const result = GetRunsQuerySchema.safeParse({
      status: "InvalidStatus",
    });

    expect(result.success).toBe(false);
  });
});

describe("UpdateEvidenceStatusSchema", () => {
  it("accepts valid evidence statuses", () => {
    expect(
      UpdateEvidenceStatusSchema.safeParse({ status: "open" }).success,
    ).toBe(true);
    expect(
      UpdateEvidenceStatusSchema.safeParse({ status: "resolved" }).success,
    ).toBe(true);
    expect(
      UpdateEvidenceStatusSchema.safeParse({ status: "ignored" }).success,
    ).toBe(true);
  });

  it("rejects invalid evidence status", () => {
    expect(
      UpdateEvidenceStatusSchema.safeParse({ status: "pending" }).success,
    ).toBe(false);
  });
});
