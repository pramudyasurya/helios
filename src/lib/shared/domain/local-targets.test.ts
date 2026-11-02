import { afterEach, describe, expect, it, vi } from "vitest";
import { CreateRunSchema } from "@/lib/shared/domain/validators";
import { shouldBlockRequestUrl } from "@/lib/server/infrastructure/runner/crawler";
import { isPrivateHostOrIp } from "@/lib/server/infrastructure/runner/runner";

describe("specs/012-local-target-flag: 3-layer SSRF opt-in validation", () => {
  const originalEnv = process.env.HELIOS_ALLOW_LOCAL_TARGETS;

  function setFlag(value: string | undefined) {
    if (value === undefined) {
      delete process.env.HELIOS_ALLOW_LOCAL_TARGETS;
    } else {
      process.env.HELIOS_ALLOW_LOCAL_TARGETS = value;
    }
  }

  afterEach(() => {
    setFlag(originalEnv);
    vi.restoreAllMocks();
  });

  describe("Layer 1: Input Validation Gate (HttpUrlSchema / CreateRunSchema)", () => {
    it("rejects local and private IPs when flag is unset", () => {
      setFlag(undefined);
      expect(CreateRunSchema.safeParse({ url: "http://localhost:3000" }).success).toBe(false);
      expect(CreateRunSchema.safeParse({ url: "http://127.0.0.1:8080" }).success).toBe(false);
      expect(CreateRunSchema.safeParse({ url: "http://192.168.1.100" }).success).toBe(false);
      expect(CreateRunSchema.safeParse({ url: "http://10.0.0.1" }).success).toBe(false);
      expect(CreateRunSchema.safeParse({ url: "http://172.16.0.1" }).success).toBe(false);
    });

    it("rejects local and private IPs when flag is set to falsey value", () => {
      for (const val of ["0", "false", "no", "off", ""]) {
        setFlag(val);
        expect(CreateRunSchema.safeParse({ url: "http://localhost:3000" }).success).toBe(false);
        expect(CreateRunSchema.safeParse({ url: "http://127.0.0.1" }).success).toBe(false);
      }
    });

    it("allows local and private IPs when flag is set to truthy values", () => {
      for (const val of ["1", "true", "yes", "TRUE", "Yes"]) {
        setFlag(val);
        expect(CreateRunSchema.safeParse({ url: "http://localhost:3000" }).success).toBe(true);
        expect(CreateRunSchema.safeParse({ url: "http://127.0.0.1:8080" }).success).toBe(true);
        expect(CreateRunSchema.safeParse({ url: "http://192.168.1.10" }).success).toBe(true);
        expect(CreateRunSchema.safeParse({ url: "http://10.0.0.1" }).success).toBe(true);
        expect(CreateRunSchema.safeParse({ url: "http://172.16.1.5" }).success).toBe(true);
      }
    });

    it("preserves strict rejection of non-http schemes and credentials even when flag is on", () => {
      setFlag("1");
      expect(CreateRunSchema.safeParse({ url: "ftp://localhost:3000" }).success).toBe(false);
      expect(CreateRunSchema.safeParse({ url: "file:///etc/passwd" }).success).toBe(false);
      expect(CreateRunSchema.safeParse({ url: "javascript:alert(1)" }).success).toBe(false);
      expect(CreateRunSchema.safeParse({ url: "http://user:pass@localhost:3000" }).success).toBe(false);
      expect(CreateRunSchema.safeParse({ url: "http://user:pass@127.0.0.1" }).success).toBe(false);
      expect(CreateRunSchema.safeParse({ url: "//localhost:3000" }).success).toBe(false);
    });
  });

  describe("Layer 2: Crawl Runtime Filter (shouldBlockRequestUrl)", () => {
    it("blocks local and private URLs in crawl when flag is unset", () => {
      setFlag(undefined);
      expect(shouldBlockRequestUrl("http://localhost:3000/api")).toBe(true);
      expect(shouldBlockRequestUrl("http://127.0.0.1:8080/dashboard")).toBe(true);
      expect(shouldBlockRequestUrl("http://192.168.1.50/home")).toBe(true);
    });

    it("allows local and private URLs in crawl when flag is enabled", () => {
      setFlag("1");
      expect(shouldBlockRequestUrl("http://localhost:3000/api")).toBe(false);
      expect(shouldBlockRequestUrl("http://127.0.0.1:8080/dashboard")).toBe(false);
      expect(shouldBlockRequestUrl("http://192.168.1.50/home")).toBe(false);
    });
    it("blocks invalid URL strings in crawl", () => {
      expect(shouldBlockRequestUrl("not-a-valid-url")).toBe(true);
      expect(shouldBlockRequestUrl("://invalid")).toBe(true);
    });
  });

  describe("Layer 3: DNS Rebinding Guard (isPrivateHostOrIp)", () => {
    it("returns false early when flag is enabled, bypassing private resolution checks", async () => {
      setFlag("1");
      const dnsCache = new Map<string, boolean>();
      const isBlocked = await isPrivateHostOrIp("localhost", dnsCache);
      expect(isBlocked).toBe(false);

      const isPrivateIpBlocked = await isPrivateHostOrIp("127.0.0.1", dnsCache);
      expect(isPrivateIpBlocked).toBe(false);

      const isRfc1918Blocked = await isPrivateHostOrIp("192.168.1.1", dnsCache);
      expect(isRfc1918Blocked).toBe(false);
    });

    it("flags private hostnames and IPs when flag is unset", async () => {
      setFlag(undefined);
      const dnsCache = new Map<string, boolean>();
      const isPrivateIpBlocked = await isPrivateHostOrIp("127.0.0.1", dnsCache);
      expect(isPrivateIpBlocked).toBe(true);

      const isRfc1918Blocked = await isPrivateHostOrIp("192.168.1.1", dnsCache);
      expect(isRfc1918Blocked).toBe(true);
    });
  });
});
