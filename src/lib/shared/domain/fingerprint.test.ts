import { describe, expect, it } from "vitest";
import {
  computeFingerprint,
  deriveSeverity,
  normalizeMessage,
  normalizeResourceUrl,
} from "@/lib/shared/domain/fingerprint";

describe("normalizeMessage", () => {
  it("strips a leading Desktop viewport prefix", () => {
    expect(normalizeMessage("[Desktop] Uncaught Error: Foo")).toBe(
      "Uncaught Error: Foo",
    );
  });

  it("strips a leading Mobile viewport prefix", () => {
    expect(normalizeMessage("[Mobile] net::ERR_FAILED on /api")).toBe(
      "net::ERR_FAILED on /api",
    );
  });

  it("tokenizes an ISO-8601 timestamp", () => {
    expect(normalizeMessage("failed at 2026-08-15T10:30:00.000Z")).toBe(
      "failed at <ts>",
    );
  });

  it("tokenizes a UUID", () => {
    expect(
      normalizeMessage("missing 550e8400-e29b-41d4-a716-446655440000"),
    ).toBe("missing <uuid>");
  });

  it("collapses file line:column positions", () => {
    expect(normalizeMessage("app.js:12:34")).toBe("app.js:<line>:<col>");
  });

  it("trims and collapses internal whitespace", () => {
    expect(normalizeMessage("  hello   world\tagain  ")).toBe(
      "hello world again",
    );
  });

  it("caps attacker-controlled input and stays fast on pathological input", () => {
    const pathological = `${"a".repeat(100_000)}:${"b".repeat(100_000)}`;
    const start = performance.now();
    const result = normalizeMessage(pathological);
    const elapsed = performance.now() - start;

    expect(result).toBe("a".repeat(4000));
    expect(elapsed).toBeLessThan(1000);
  });
});

describe("normalizeResourceUrl", () => {
  it("lowercases the host while preserving the path case", () => {
    expect(normalizeResourceUrl("https://EXAMPLE.com/Path/To/Resource")).toBe(
      "https://example.com/Path/To/Resource",
    );
  });

  it("strips query and hash", () => {
    expect(
      normalizeResourceUrl("https://example.com/path?query=1#fragment"),
    ).toBe("https://example.com/path");
  });

  it("strips default https port", () => {
    expect(normalizeResourceUrl("https://example.com:443/path")).toBe(
      "https://example.com/path",
    );
  });

  it("strips default http port", () => {
    expect(normalizeResourceUrl("http://example.com:80/path")).toBe(
      "http://example.com/path",
    );
  });

  it("keeps a non-default port", () => {
    expect(normalizeResourceUrl("http://localhost:3000/api")).toBe(
      "http://localhost:3000/api",
    );
  });

  it("strips a trailing slash unless the path is the root", () => {
    expect(normalizeResourceUrl("https://example.com/path/")).toBe(
      "https://example.com/path",
    );
    expect(normalizeResourceUrl("https://example.com/")).toBe(
      "https://example.com/",
    );
  });

  it("collapses duplicate slashes", () => {
    expect(normalizeResourceUrl("https://example.com//a//b///c")).toBe(
      "https://example.com/a/b/c",
    );
  });

  it("falls back to lowercasing and stripping query/hash on parse failure", () => {
    expect(normalizeResourceUrl("Not A URL?q=1#frag")).toBe("not a url");
  });
});

describe("computeFingerprint", () => {
  it("returns the same hash for the same input", () => {
    const input = { environmentId: "env-1", type: "console" as const, message: "Error: boom" };
    expect(computeFingerprint(input)).toBe(computeFingerprint(input));
  });

  it("returns a different hash for a different environmentId", () => {
    const base = { type: "console" as const, message: "Error: boom" };
    expect(
      computeFingerprint({ ...base, environmentId: "env-1" }),
    ).not.toBe(computeFingerprint({ ...base, environmentId: "env-2" }));
  });

  it("returns a different hash for a different normalized message", () => {
    const base = { environmentId: "env-1", type: "console" as const };
    expect(computeFingerprint({ ...base, message: "Error: foo" })).not.toBe(
      computeFingerprint({ ...base, message: "Error: bar" }),
    );
  });

  it("does not change the hash when only the viewport prefix differs", () => {
    const base = { environmentId: "env-1", type: "console" as const };
    expect(
      computeFingerprint({ ...base, message: "[Desktop] Error: boom" }),
    ).toBe(computeFingerprint({ ...base, message: "Error: boom" }));
  });

  it("does not change the hash when only a timestamp differs", () => {
    const base = { environmentId: "env-1", type: "console" as const };
    expect(
      computeFingerprint({
        ...base,
        message: "failed at 2026-08-15T10:30:00.000Z",
      }),
    ).toBe(
      computeFingerprint({
        ...base,
        message: "failed at 2026-08-16T11:31:01.000Z",
      }),
    );
  });

  it("hashes the same network URL with different query params identically", () => {
    const base = { environmentId: "env-1", type: "network" as const };
    expect(
      computeFingerprint({
        ...base,
        message: "https://cdn.example.com/app.js?v=1 - net::ERR_FAILED",
      }),
    ).toBe(
      computeFingerprint({
        ...base,
        message: "https://cdn.example.com/app.js?cache=2 - net::ERR_FAILED",
      }),
    );
  });

  it("keeps network errors distinct when the error text differs", () => {
    const base = { environmentId: "env-1", type: "network" as const };
    expect(
      computeFingerprint({
        ...base,
        message: "https://cdn.example.com/app.js - net::ERR_FAILED",
      }),
    ).not.toBe(
      computeFingerprint({
        ...base,
        message: "https://cdn.example.com/app.js - net::ERR_CERT_DATE_INVALID",
      }),
    );
  });

  it("hashes image URLs identically across trailing slash variance", () => {
    const base = { environmentId: "env-1", type: "image" as const };
    expect(
      computeFingerprint({
        ...base,
        message: "https://img.example.com/logo.png",
      }),
    ).toBe(
      computeFingerprint({
        ...base,
        message: "https://img.example.com/logo.png/",
      }),
    );
  });
});

describe("deriveSeverity", () => {
  it("maps console to low", () => {
    expect(deriveSeverity("console")).toBe("low");
  });

  it("maps network to medium", () => {
    expect(deriveSeverity("network")).toBe("medium");
  });

  it("maps image to medium", () => {
    expect(deriveSeverity("image")).toBe("medium");
  });
});
