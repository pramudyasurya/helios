import { describe, expect, it } from "vitest";
import {
  CHECK_TITLE_COOKIE_SECURITY,
  CHECK_TITLE_MIXED_CONTENT,
  CHECK_TITLE_SECURITY_HEADERS,
  evaluateCookieSecurity,
  evaluateSecurityHeaders,
} from "./security";

describe("security domain", () => {
  describe("constants", () => {
    it("exports stable check titles", () => {
      expect(CHECK_TITLE_SECURITY_HEADERS).toBe("Security headers checked");
      expect(CHECK_TITLE_COOKIE_SECURITY).toBe("Cookie security attributes checked");
      expect(CHECK_TITLE_MIXED_CONTENT).toBe("Mixed content subresources checked");
    });
  });

  describe("evaluateSecurityHeaders", () => {
    it("passes when all standard security headers are valid and configured on HTTPS", () => {
      const headers = {
        "strict-transport-security": "max-age=31536000; includeSubDomains; preload",
        "content-security-policy": "default-src 'self'; script-src 'self' 'nonce-rAnd0m'; frame-ancestors 'none'",
        "x-content-type-options": "nosniff",
        "x-frame-options": "DENY",
        "permissions-policy": "geolocation=(), camera=()",
      };

      const result = evaluateSecurityHeaders("https://example.com", headers);
      expect(result.status).toBe("passed");
      expect(result.severity).toBe("info");
      expect(result.findings).toHaveLength(0);
      expect(result.detail).toContain("All standard security headers are present");
    });

    it("handles case-insensitive header keys", () => {
      const headers = {
        "Strict-Transport-Security": "max-age=15552000",
        "Content-Security-Policy": "default-src 'self'",
        "X-Content-Type-Options": "NOSNIFF",
        "X-Frame-Options": "SAMEORIGIN",
        "Permissions-Policy": "interest-cohort=()",
      };

      const result = evaluateSecurityHeaders("https://example.com", headers);
      expect(result.status).toBe("passed");
      expect(result.findings).toHaveLength(0);
    });

    it("ignores HSTS requirement for HTTP origins", () => {
      const headers = {
        "content-security-policy": "default-src 'self'",
        "x-content-type-options": "nosniff",
        "x-frame-options": "DENY",
        "permissions-policy": "geolocation=()",
      };

      const result = evaluateSecurityHeaders("http://example.com", headers);
      expect(result.status).toBe("passed");
      expect(result.findings.some((f) => f.header === "strict-transport-security")).toBe(false);
    });

    it("warns when HSTS is missing on HTTPS origin", () => {
      const headers = {
        "content-security-policy": "default-src 'self'",
        "x-content-type-options": "nosniff",
        "x-frame-options": "DENY",
        "permissions-policy": "geolocation=()",
      };

      const result = evaluateSecurityHeaders("https://example.com", headers);
      expect(result.status).toBe("warning");
      const hstsFinding = result.findings.find((f) => f.header === "strict-transport-security");
      expect(hstsFinding).toBeDefined();
      expect(hstsFinding?.detail).toContain("missing on HTTPS origin");
      expect(hstsFinding?.severity).toBe("medium");
    });

    it("warns when HSTS max-age is below recommended threshold (< 10368000 / 120 days)", () => {
      const headers = {
        "strict-transport-security": "max-age=86400", // 1 day
        "content-security-policy": "default-src 'self'",
        "x-content-type-options": "nosniff",
        "x-frame-options": "DENY",
        "permissions-policy": "geolocation=()",
      };

      const result = evaluateSecurityHeaders("https://example.com", headers);
      expect(result.status).toBe("warning");
      const hstsFinding = result.findings.find((f) => f.header === "strict-transport-security");
      expect(hstsFinding).toBeDefined();
      expect(hstsFinding?.detail).toContain("below recommended minimum");
      expect(hstsFinding?.severity).toBe("low");
    });

    it("warns when CSP is missing", () => {
      const headers = {
        "strict-transport-security": "max-age=31536000",
        "x-content-type-options": "nosniff",
        "x-frame-options": "DENY",
        "permissions-policy": "geolocation=()",
      };

      const result = evaluateSecurityHeaders("https://example.com", headers);
      expect(result.status).toBe("warning");
      const cspFinding = result.findings.find((f) => f.header === "content-security-policy");
      expect(cspFinding).toBeDefined();
      expect(cspFinding?.detail).toContain("Content-Security-Policy header is missing");
      expect(cspFinding?.severity).toBe("medium");
    });

    it("warns when CSP contains unsafe-inline or unsafe-eval", () => {
      const headers = {
        "strict-transport-security": "max-age=31536000",
        "content-security-policy": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "x-content-type-options": "nosniff",
        "x-frame-options": "DENY",
        "permissions-policy": "geolocation=()",
      };

      const result = evaluateSecurityHeaders("https://example.com", headers);
      expect(result.status).toBe("warning");
      const cspFinding = result.findings.find((f) => f.header === "content-security-policy");
      expect(cspFinding).toBeDefined();
      expect(cspFinding?.detail).toContain("unsafe-inline");
      expect(cspFinding?.detail).toContain("unsafe-eval");
    });

    it("warns when CSP contains wildcard * without nonce or hash", () => {
      const headers = {
        "strict-transport-security": "max-age=31536000",
        "content-security-policy": "default-src *; script-src *",
        "x-content-type-options": "nosniff",
        "x-frame-options": "DENY",
        "permissions-policy": "geolocation=()",
      };

      const result = evaluateSecurityHeaders("https://example.com", headers);
      expect(result.status).toBe("warning");
      const cspFinding = result.findings.find((f) => f.header === "content-security-policy");
      expect(cspFinding?.detail).toContain("wildcard without nonce/hash");
    });

    it("does not warn about wildcard if nonce is present in CSP", () => {
      const headers = {
        "strict-transport-security": "max-age=31536000",
        "content-security-policy": "default-src *; script-src 'nonce-abc12345'",
        "x-content-type-options": "nosniff",
        "x-frame-options": "DENY",
        "permissions-policy": "geolocation=()",
      };

      const result = evaluateSecurityHeaders("https://example.com", headers);
      const cspFinding = result.findings.find((f) => f.header === "content-security-policy");
      expect(cspFinding).toBeUndefined();
    });

    it("warns when X-Content-Type-Options is missing or invalid", () => {
      const resultMissing = evaluateSecurityHeaders("https://example.com", {});
      expect(resultMissing.findings.some((f) => f.header === "x-content-type-options")).toBe(true);

      const resultWrong = evaluateSecurityHeaders("https://example.com", {
        "x-content-type-options": "sniff",
      });
      expect(resultWrong.findings.some((f) => f.header === "x-content-type-options")).toBe(true);
    });

    it("satisfies clickjacking protection via CSP frame-ancestors when X-Frame-Options is missing", () => {
      const headers = {
        "strict-transport-security": "max-age=31536000",
        "content-security-policy": "frame-ancestors 'self'",
        "x-content-type-options": "nosniff",
        "permissions-policy": "geolocation=()",
      };

      const result = evaluateSecurityHeaders("https://example.com", headers);
      const xfoFinding = result.findings.find((f) => f.header === "x-frame-options");
      expect(xfoFinding).toBeUndefined();
    });

    it("warns when neither X-Frame-Options nor frame-ancestors is present", () => {
      const headers = {
        "strict-transport-security": "max-age=31536000",
        "content-security-policy": "default-src 'self'",
        "x-content-type-options": "nosniff",
        "permissions-policy": "geolocation=()",
      };

      const result = evaluateSecurityHeaders("https://example.com", headers);
      const xfoFinding = result.findings.find((f) => f.header === "x-frame-options");
      expect(xfoFinding).toBeDefined();
      expect(xfoFinding?.detail).toContain("Clickjacking protection missing");
      expect(xfoFinding?.severity).toBe("medium");
    });

    it("warns when Permissions-Policy is missing", () => {
      const headers = {
        "strict-transport-security": "max-age=31536000",
        "content-security-policy": "default-src 'self'",
        "x-content-type-options": "nosniff",
        "x-frame-options": "DENY",
      };

      const result = evaluateSecurityHeaders("https://example.com", headers);
      const ppFinding = result.findings.find((f) => f.header === "permissions-policy");
      expect(ppFinding).toBeDefined();
      expect(ppFinding?.severity).toBe("low");
    });
  });

  describe("evaluateCookieSecurity", () => {
    it("returns passed when no cookies are provided", () => {
      const result = evaluateCookieSecurity([], true);
      expect(result.status).toBe("passed");
      expect(result.findings).toHaveLength(0);
    });

    it("returns passed when all cookies have proper secure and httpOnly flags", () => {
      const cookies = [
        { name: "session_id", secure: true, httpOnly: true, sameSite: "Lax" },
        { name: "theme", secure: true, httpOnly: false, sameSite: "Strict" },
      ];

      const result = evaluateCookieSecurity(cookies, true);
      expect(result.status).toBe("passed");
      expect(result.findings).toHaveLength(0);
    });

    it("flags insecure cookies when over HTTPS", () => {
      const cookies = [
        { name: "pref", secure: false, httpOnly: false },
      ];

      const result = evaluateCookieSecurity(cookies, true);
      expect(result.status).toBe("warning");
      expect(result.findings).toHaveLength(1);
      expect(result.findings[0]).toEqual({
        cookieName: "pref",
        issue: "insecure",
        detail: "Cookie 'pref' is missing the Secure attribute over HTTPS.",
      });
    });

    it("does not flag missing secure on plain HTTP", () => {
      const cookies = [
        { name: "pref", secure: false, httpOnly: false },
      ];

      const result = evaluateCookieSecurity(cookies, false);
      expect(result.status).toBe("passed");
      expect(result.findings).toHaveLength(0);
    });

    it("flags missing HttpOnly for sensitive auth/session/token/jwt/sid/key cookies", () => {
      const sensitiveNames = [
        "session",
        "my_session_id",
        "auth_token",
        "USER_TOKEN",
        "jwt",
        "connect.sid",
        "api_key",
      ];

      for (const name of sensitiveNames) {
        const result = evaluateCookieSecurity([{ name, secure: true, httpOnly: false }], true);
        expect(result.status).toBe("warning");
        expect(result.findings.some((f) => f.issue === "missing-httponly" && f.cookieName === name)).toBe(true);
      }
    });

    it("does not flag missing HttpOnly on non-sensitive cookies", () => {
      const nonSensitive = ["theme", "user_locale", "visited", "tracking_optout"];
      for (const name of nonSensitive) {
        const result = evaluateCookieSecurity([{ name, secure: true, httpOnly: false }], true);
        expect(result.status).toBe("passed");
        expect(result.findings).toHaveLength(0);
      }
    });

    it("flags SameSite=None without Secure attribute", () => {
      const cookies = [
        { name: "tracker", secure: false, sameSite: "None" },
      ];

      // Even on HTTP or HTTPS, SameSite=None without Secure is invalid per modern browser specs
      const result = evaluateCookieSecurity(cookies, false);
      expect(result.status).toBe("warning");
      const finding = result.findings.find((f) => f.issue === "invalid-samesite-none");
      expect(finding).toBeDefined();
      expect(finding?.detail).toContain("SameSite=None but is missing the Secure attribute");
    });

    it("aggregates multiple issues for a single cookie", () => {
      const cookies = [
        { name: "auth_token", secure: false, httpOnly: false, sameSite: "none" },
      ];

      const result = evaluateCookieSecurity(cookies, true);
      expect(result.status).toBe("warning");
      expect(result.findings).toHaveLength(3); // insecure, missing-httponly, invalid-samesite-none
    });
  });
});
