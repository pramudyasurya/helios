import { describe, expect, it } from "vitest";

import {
  detectBotChallenge,
  isLoginRedirect,
} from "@/lib/shared/domain/bot-protection";

describe("detectBotChallenge", () => {
  it("detects a Cloudflare challenge header regardless of status code", () => {
    expect(detectBotChallenge({ "cf-mitigated": "challenge" })).toBe("challenge");
  });

  it("detects the header case-insensitively", () => {
    expect(detectBotChallenge({ "CF-Mitigated": "Challenge" })).toBe("challenge");
  });

  it("detects a captcha-specific challenge", () => {
    expect(detectBotChallenge({ "cf-mitigated": "captcha" })).toBe("captcha");
  });

  it("detects an outright block", () => {
    expect(detectBotChallenge({ "cf-mitigated": "block" })).toBe("block");
  });

  it("detects an AWS WAF challenge", () => {
    expect(detectBotChallenge({ "x-amzn-waf-action": "challenge" })).toBe(
      "challenge",
    );
  });

  it("ignores unrelated headers and missing headers", () => {
    expect(detectBotChallenge({ server: "cloudflare" })).toBeUndefined();
    expect(detectBotChallenge({})).toBeUndefined();
    expect(detectBotChallenge(undefined)).toBeUndefined();
  });
});

describe("isLoginRedirect", () => {
  it("flags a redirect from a protected path to a login path", () => {
    expect(
      isLoginRedirect(
        "https://app.example.com/dashboard",
        "https://app.example.com/login",
      ),
    ).toBe(true);
  });

  it("flags a redirect that carries a next param", () => {
    expect(
      isLoginRedirect(
        "https://app.example.com/dashboard",
        "https://app.example.com/?next=/dashboard",
      ),
    ).toBe(true);
  });

  it("flags sign-in and SSO variants", () => {
    expect(
      isLoginRedirect(
        "https://app.example.com/reports",
        "https://app.example.com/sign-in",
      ),
    ).toBe(true);
    expect(
      isLoginRedirect(
        "https://app.example.com/reports",
        "https://app.example.com/sso/start",
      ),
    ).toBe(true);
  });

  it("does not flag a run that was asked to load the login page", () => {
    expect(
      isLoginRedirect(
        "https://app.example.com/login",
        "https://app.example.com/login",
      ),
    ).toBe(false);
    expect(
      isLoginRedirect(
        "https://app.example.com/login",
        "https://app.example.com/login?error=1",
      ),
    ).toBe(false);
  });

  it("does not flag a normal in-app navigation", () => {
    expect(
      isLoginRedirect(
        "https://app.example.com/",
        "https://app.example.com/dashboard",
      ),
    ).toBe(false);
  });

  it("does not flag a cross-host redirect", () => {
    expect(
      isLoginRedirect(
        "https://app.example.com/dashboard",
        "https://docs.example.com/guide",
      ),
    ).toBe(false);
  });

  it("returns false when either URL is missing or malformed", () => {
    expect(isLoginRedirect(undefined, "https://app.example.com/login")).toBe(
      false,
    );
    expect(isLoginRedirect("https://app.example.com/dashboard", undefined)).toBe(
      false,
    );
    expect(isLoginRedirect("not-a-url", "https://app.example.com/login")).toBe(
      false,
    );
  });
});
