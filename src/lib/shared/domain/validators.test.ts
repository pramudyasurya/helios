import { afterEach, describe, expect, it } from "vitest";
import {
  allowLocalTargets,
  CreateEnvironmentSchema,
  CreateProjectSchema,
  CreateRunSchema,
  CreateScheduleSchema,
  GetRunsQuerySchema,
  isValidHttpUrl,
  normalizeUrl,
  resolveRelativeRoute,
  UpdateEvidenceStatusSchema,
  validateAIReport,
} from "@/lib/shared/domain/validators";

describe("resolveRelativeRoute", () => {
  it("resolves relative path against base URL origin", () => {
    expect(resolveRelativeRoute("/login", "https://example.com/sub/dir")).toBe("https://example.com/login");
    expect(resolveRelativeRoute("about", "https://example.com/home")).toBe("https://example.com/about");
    expect(resolveRelativeRoute("  /dashboard  ", "https://example.com")).toBe("https://example.com/dashboard");
  });

  it("returns full http/https URLs unchanged", () => {
    expect(resolveRelativeRoute("https://other.com/page", "https://example.com")).toBe("https://other.com/page");
  });

  it("preserves absolute HTTP(S) routes regardless of scheme casing", () => {
    expect(resolveRelativeRoute("HTTPS://other.com/page", "https://example.com")).toBe("HTTPS://other.com/page");
  });

  it("returns empty string for invalid/dangerous relative values", () => {
    expect(resolveRelativeRoute("//evil.com/path", "https://example.com")).toBe("");
    expect(resolveRelativeRoute("javascript:alert(1)", "https://example.com")).toBe("");
    expect(resolveRelativeRoute("http://user:pass@example.com", "https://example.com")).toBe("");
    expect(resolveRelativeRoute("   ", "https://example.com")).toBe("");
  });
});

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

describe("normalizeUrl", () => {
  it("prepends https for public scheme-less domains", () => {
    expect(normalizeUrl("example.com")).toBe("https://example.com");
    expect(normalizeUrl("example.com/path?q=1")).toBe("https://example.com/path?q=1");
  });

  it("prepends http for localhost and private targets", () => {
    expect(normalizeUrl("localhost:3000")).toBe("http://localhost:3000");
    expect(normalizeUrl("127.0.0.1")).toBe("http://127.0.0.1");
    expect(normalizeUrl("192.168.1.100:8080")).toBe("http://192.168.1.100:8080");
    expect(normalizeUrl("10.0.0.1")).toBe("http://10.0.0.1");
  });

  it("leaves existing http/https schemes unchanged (idempotent)", () => {
    expect(normalizeUrl("https://example.com")).toBe("https://example.com");
    expect(normalizeUrl("http://example.com")).toBe("http://example.com");
    expect(normalizeUrl("HTTPS://example.com")).toBe("HTTPS://example.com");
  });

  it("leaves known non-http schemes unchanged for downstream rejection", () => {
    expect(normalizeUrl("ftp://example.com")).toBe("ftp://example.com");
    expect(normalizeUrl("javascript:alert(1)")).toBe("javascript:alert(1)");
    expect(normalizeUrl("file:///etc/passwd")).toBe("file:///etc/passwd");
  });

  it("handles host:port disambiguation", () => {
    expect(normalizeUrl("example.com:8080")).toBe("https://example.com:8080");
    expect(normalizeUrl("localhost:3000")).toBe("http://localhost:3000");
  });

  it("trims whitespace", () => {
    expect(normalizeUrl("  example.com  ")).toBe("https://example.com");
    expect(normalizeUrl("https://example.com  ")).toBe("https://example.com");
  });

  it("returns empty string for blank input", () => {
    expect(normalizeUrl("")).toBe("");
    expect(normalizeUrl("   ")).toBe("");
  });

  it("leaves protocol-relative URLs unchanged for downstream rejection", () => {
    expect(normalizeUrl("//example.com")).toBe("//example.com");
    expect(normalizeUrl("//127.0.0.1")).toBe("//127.0.0.1");
  });

  it("leaves single-slash schemes unchanged for downstream rejection", () => {
    expect(normalizeUrl("https:example.com")).toBe("https:example.com");
    expect(normalizeUrl("http:/example.com")).toBe("http:/example.com");
  });

  it("prepends http for trailing-dot local targets", () => {
    expect(normalizeUrl("127.0.0.1.")).toBe("http://127.0.0.1.");
    expect(normalizeUrl("localhost.")).toBe("http://localhost.");
    expect(normalizeUrl("169.254.169.254.")).toBe("http://169.254.169.254.");
  });

  it("leaves malformed and single-label hosts unchanged", () => {
    expect(normalizeUrl("http//localhost")).toBe("http//localhost");
    expect(normalizeUrl("example")).toBe("example");
    expect(normalizeUrl("intranet")).toBe("intranet");
  });

  it("prepends https for IDN and dotted public hosts", () => {
    expect(normalizeUrl("münchen.de")).toBe("https://münchen.de");
    expect(normalizeUrl("sub.domain.co.uk")).toBe("https://sub.domain.co.uk");
  });

  it("prepends http for IPv6 loopback", () => {
    expect(normalizeUrl("[::1]")).toBe("http://[::1]");
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

  it("normalizes scheme-less public URLs via the preprocess", () => {
    const result = CreateRunSchema.safeParse({ url: "example.com" });

    expect(result.success).toBe(true);
    expect(result.data?.url).toBe("https://example.com");
  });

  it("normalizes scheme-less localhost and rejects it via SSRF", () => {
    const result = CreateRunSchema.safeParse({ url: "localhost:3000" });

    expect(result.success).toBe(false);
  });

  it("rejects malformed scheme-less input via the preprocess", () => {
    expect(CreateRunSchema.safeParse({ url: "http//localhost" }).success).toBe(false);
    expect(CreateRunSchema.safeParse({ url: "//example.com" }).success).toBe(false);
  });

  it("accepts public IPv6", () => {
    const testPublicIPv6 = CreateRunSchema.safeParse({
      url: "https://[2001:db8::1]",
    });

    expect(testPublicIPv6.success).toBe(true);
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

  it("rejects IPv6 brackets and hex representation SSRF bypasses", () => {
    const testIPv6Bracket = CreateRunSchema.safeParse({
      url: "http://[::ffff:127.0.0.1]",
    });
    const testIPv6Hex = CreateRunSchema.safeParse({
      url: "http://[::ffff:7f00:1]",
    });
    const testIPv6HexPrivate = CreateRunSchema.safeParse({
      url: "http://[::ffff:a00:1]",
    });

    expect(testIPv6Bracket.success).toBe(false);
    expect(testIPv6Hex.success).toBe(false);
    expect(testIPv6HexPrivate.success).toBe(false);
  });

  it("rejects 0.0.0.0 and [::] IP address", () => {
    const testZeroIp = CreateRunSchema.safeParse({
      url: "http://0.0.0.0",
    });
    const testEmptyIp = CreateRunSchema.safeParse({
      url: "http://[::]",
    });

    expect(testZeroIp.success).toBe(false);
    expect(testEmptyIp.success).toBe(false);
  });

  it("rejects ULA and LLA", () => {
    const testULA = CreateRunSchema.safeParse({
      url: "http://[fd00::1]",
    });
    const testULA2 = CreateRunSchema.safeParse({
      url: "http://[fdff::1]",
    });
    const testLLA = CreateRunSchema.safeParse({
      url: "http://[fe80::1]",
    });
    const testLLA2 = CreateRunSchema.safeParse({
      url: "http://[febf::1]",
    });

    expect(testULA.success).toBe(false);
    expect(testULA2.success).toBe(false);
    expect(testLLA.success).toBe(false);
    expect(testLLA2.success).toBe(false);
  });

  it("rejects alternate bases and integer formats of IPv4", () => {
    const testDecimalInt = CreateRunSchema.safeParse({
      url: "http://2130706433", // 127.0.0.1
    });
    const testHexInt = CreateRunSchema.safeParse({
      url: "http://0x7f000001", // 127.0.0.1
    });
    const testOctalInt = CreateRunSchema.safeParse({
      url: "http://017700000001", // 127.0.0.1
    });
    const testMixedHex = CreateRunSchema.safeParse({
      url: "http://0x7f.0.0.1", // 127.0.0.1
    });

    expect(testDecimalInt.success).toBe(false);
    expect(testHexInt.success).toBe(false);
    expect(testOctalInt.success).toBe(false);
    expect(testMixedHex.success).toBe(false);
  });

  it("rejects shorthand IPv4 formats", () => {
    const testShorthand1 = CreateRunSchema.safeParse({
      url: "http://127.1", // 127.0.0.1
    });
    const testShorthand2 = CreateRunSchema.safeParse({
      url: "http://10.1", // 10.0.0.1
    });

    expect(testShorthand1.success).toBe(false);
    expect(testShorthand2.success).toBe(false);
  });

  it("rejects IPv4-compatible and IPv4-mapped IPv6 formats", () => {
    const testCompatible = CreateRunSchema.safeParse({
      url: "http://[::127.0.0.1]",
    });
    const testMapped = CreateRunSchema.safeParse({
      url: "http://[::ffff:0:127.0.0.1]",
    });

    expect(testCompatible.success).toBe(false);
    expect(testMapped.success).toBe(false);
  });

  it("rejects site-local and multicast IPv6 ranges", () => {
    const testSiteLocal = CreateRunSchema.safeParse({
      url: "http://[fec0::1]",
    });
    const testMulticast = CreateRunSchema.safeParse({
      url: "http://[ff02::1]",
    });

    expect(testSiteLocal.success).toBe(false);
    expect(testMulticast.success).toBe(false);
  });

  it("rejects fully-expanded mapped/compatible IPv6 formats", () => {
    const testExpandedCompat = CreateRunSchema.safeParse({
      url: "http://[0000:0000:0000:0000:0000:0000:7f00:0001]", // ::127.0.0.1
    });
    const testExpandedMapped = CreateRunSchema.safeParse({
      url: "http://[0000:0000:0000:0000:0000:ffff:7f00:0001]", // ::ffff:127.0.0.1
    });
    const testExpandedMapped0 = CreateRunSchema.safeParse({
      url: "http://[0000:0000:0000:0000:ffff:0000:7f00:0001]", // ::ffff:0:127.0.0.1
    });

    expect(testExpandedCompat.success).toBe(false);
    expect(testExpandedMapped.success).toBe(false);
    expect(testExpandedMapped0.success).toBe(false);
  });

  it("normalizes root-relative, bare-relative, and absolute manual routes correctly", () => {
    const res = CreateRunSchema.safeParse({
      url: "https://example.com/base/path",
      mode: "manual",
      routes: ["/login", "about", "  /dashboard  ", "https://other.com/docs"],
    });

    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.routes).toEqual([
        "https://example.com/login",
        "https://example.com/about",
        "https://example.com/dashboard",
        "https://other.com/docs",
      ]);
    }
  });

  it("rejects manual mode when routes list is empty", () => {
    const res = CreateRunSchema.safeParse({
      url: "https://example.com",
      mode: "manual",
      routes: [],
    });
    expect(res.success).toBe(false);
  });

  it("rejects relative routes that normalize to SSRF / private IP targets", () => {
    const res = CreateRunSchema.safeParse({
      url: "http://127.0.0.1",
      mode: "manual",
      routes: ["/admin"],
    });
    expect(res.success).toBe(false);
  });

  it("rejects invalid or dangerous relative route inputs", () => {
    expect(
      CreateRunSchema.safeParse({
        url: "https://example.com",
        mode: "manual",
        routes: ["//evil.com"],
      }).success,
    ).toBe(false);

    expect(
      CreateRunSchema.safeParse({
        url: "https://example.com",
        mode: "manual",
        routes: ["javascript:alert(1)"],
      }).success,
    ).toBe(false);

    expect(
      CreateRunSchema.safeParse({
        url: "https://example.com",
        mode: "manual",
        routes: ["http://user:pass@example.com"],
      }).success,
    ).toBe(false);
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

describe("CreateProjectSchema and CreateEnvironmentSchema", () => {
  it("validates project name", () => {
    expect(CreateProjectSchema.safeParse({ name: "Storefront" }).success).toBe(true);
    const result = CreateProjectSchema.safeParse({ name: "   " });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Project name is required.");
    }
  });

  it("validates environment name and optional baseUrl", () => {
    expect(
      CreateEnvironmentSchema.safeParse({
        name: "Staging",
        baseUrl: "https://staging.example.com",
      }).success
    ).toBe(true);

    expect(
      CreateEnvironmentSchema.safeParse({
        name: "Staging",
        baseUrl: "",
      }).success
    ).toBe(true);

    expect(
      CreateEnvironmentSchema.safeParse({
        name: "Staging",
        baseUrl: "http://localhost:3000",
      }).success
    ).toBe(false);
  });
});

describe("CreateScheduleSchema", () => {
  const validBase = { cronExpression: "17 2 * * *" };

  it("accepts a valid schedule", () => {
    expect(CreateScheduleSchema.safeParse(validBase).success).toBe(true);
  });

  it("rejects manual mode without routes", () => {
    const result = CreateScheduleSchema.safeParse({
      ...validBase,
      mode: "manual",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "At least one route is required in manual mode.",
      );
    }
  });

  it("accepts manual mode with routes", () => {
    expect(
      CreateScheduleSchema.safeParse({
        ...validBase,
        mode: "manual",
        routes: ["https://example.com/login"],
      }).success,
    ).toBe(true);
  });

  it("rejects non-URL routes", () => {
    expect(
      CreateScheduleSchema.safeParse({
        ...validBase,
        routes: ["/login"],
      }).success,
    ).toBe(false);
    expect(
      CreateScheduleSchema.safeParse({
        ...validBase,
        routes: ["javascript:alert(1)"],
      }).success,
    ).toBe(false);
  });

  it("rejects a 6-field cron expression", () => {
    expect(
      CreateScheduleSchema.safeParse({
        ...validBase,
        cronExpression: "0 17 2 * * *",
      }).success,
    ).toBe(false);
  });
});

describe("CreateRunSchema run context", () => {  it("accepts an ad-hoc run or a complete Project and Environment context", () => {
    expect(CreateRunSchema.safeParse({ url: "https://example.com" }).success).toBe(true);
    expect(
      CreateRunSchema.safeParse({
        url: "https://example.com",
        projectId: "project-1",
        environmentId: "environment-1",
      }).success,
    ).toBe(true);
  });

  it("rejects partial context and accepts widened origins in the run contract", () => {
    expect(
      CreateRunSchema.safeParse({
        url: "https://example.com",
        projectId: "project-1",
      }).success,
    ).toBe(false);
    expect(
      CreateRunSchema.safeParse({
        url: "https://example.com",
        origin: "ci",
      }).success,
    ).toBe(true);
    expect(
      CreateRunSchema.safeParse({
        url: "https://example.com",
        origin: "scheduled",
      }).success,
    ).toBe(true);
  });
});

describe("HELIOS_ALLOW_LOCAL_TARGETS (SSRF opt-in)", () => {
  const original = process.env.HELIOS_ALLOW_LOCAL_TARGETS;

  function setFlag(value: string | undefined) {
    if (value === undefined) {
      delete process.env.HELIOS_ALLOW_LOCAL_TARGETS;
    } else {
      process.env.HELIOS_ALLOW_LOCAL_TARGETS = value;
    }
  }

  afterEach(() => {
    setFlag(original);
  });

  it("allowLocalTargets is false when unset and truthy for 1/true/yes/on", () => {
    setFlag(undefined);
    expect(allowLocalTargets()).toBe(false);

    for (const value of ["1", "true", "yes", "on", "TRUE", "Yes"]) {
      setFlag(value);
      expect(allowLocalTargets()).toBe(true);
    }
  });

  it("allowLocalTargets is false for falsey values", () => {
    for (const value of ["0", "false", "no", "off", ""]) {
      setFlag(value);
      expect(allowLocalTargets()).toBe(false);
    }
  });

  it("accepts localhost and private IPs when the flag is on", () => {
    setFlag("1");
    expect(CreateRunSchema.safeParse({ url: "http://localhost:3000" }).success).toBe(true);
    expect(CreateRunSchema.safeParse({ url: "http://127.0.0.1" }).success).toBe(true);
    expect(CreateRunSchema.safeParse({ url: "http://192.168.1.10" }).success).toBe(true);
    expect(CreateRunSchema.safeParse({ url: "http://10.0.0.1" }).success).toBe(true);
  });

  it("still rejects non-http schemes and userinfo with the flag on", () => {
    setFlag("1");
    expect(CreateRunSchema.safeParse({ url: "ftp://example.com" }).success).toBe(false);
    expect(CreateRunSchema.safeParse({ url: "http://user:pass@example.com" }).success).toBe(false);
  });
});
