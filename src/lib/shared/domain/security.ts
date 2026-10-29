import type { CheckSeverity, CheckStatus } from "@/lib/shared/domain/types";

export const CHECK_TITLE_SECURITY_HEADERS = "Security headers checked" as const;
export const CHECK_TITLE_COOKIE_SECURITY = "Cookie security attributes checked" as const;
export const CHECK_TITLE_MIXED_CONTENT = "Mixed content subresources checked" as const;

export type HeaderFinding = {
  header: string;
  status: CheckStatus;
  severity: CheckSeverity;
  detail: string;
};

export type SecurityEvaluationResult = {
  status: CheckStatus;
  severity: CheckSeverity;
  detail: string;
  findings: HeaderFinding[];
};

export type CookieFinding = {
  cookieName: string;
  issue: "insecure" | "missing-httponly" | "invalid-samesite-none";
  detail: string;
};

export type CookieSecurityResult = {
  status: CheckStatus;
  severity: CheckSeverity;
  detail: string;
  findings: CookieFinding[];
};

export type CookieInput = {
  name: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: string;
};

const SENSITIVE_COOKIE_REGEX = /(?:session|auth|token|jwt|sid|key)/i;
const MIN_HSTS_MAX_AGE = 10368000; // 120 days

/**
 * Normalizes headers to lower-case keys for case-insensitive lookup.
 */
function normalizeHeaders(headers: Record<string, string>): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    normalized[key.toLowerCase()] = value;
  }
  return normalized;
}

/**
 * Parses max-age from Strict-Transport-Security header value.
 */
function parseHstsMaxAge(hstsValue: string): number | null {
  const match = hstsValue.match(/max-age\s*=\s*(\d+)/i);
  if (!match) return null;
  const parsed = parseInt(match[1], 10);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Evaluates standard HTTP security headers for a given URL and response headers.
 */
export function evaluateSecurityHeaders(
  url: string,
  headers: Record<string, string>
): SecurityEvaluationResult {
  const norm = normalizeHeaders(headers);
  const isHttps = url.toLowerCase().startsWith("https://");
  const findings: HeaderFinding[] = [];

  // 1. Strict-Transport-Security (HSTS)
  if (isHttps) {
    const hsts = norm["strict-transport-security"];
    if (!hsts) {
      findings.push({
        header: "strict-transport-security",
        status: "warning",
        severity: "medium",
        detail: "Strict-Transport-Security header is missing on HTTPS origin.",
      });
    } else {
      const maxAge = parseHstsMaxAge(hsts);
      if (maxAge === null || maxAge < MIN_HSTS_MAX_AGE) {
        findings.push({
          header: "strict-transport-security",
          status: "warning",
          severity: "low",
          detail: `Strict-Transport-Security max-age (${maxAge ?? 0}s) is below recommended minimum (${MIN_HSTS_MAX_AGE}s / 120 days).`,
        });
      }
    }
  }

  // 2. Content-Security-Policy (CSP)
  const csp = norm["content-security-policy"];
  if (!csp) {
    findings.push({
      header: "content-security-policy",
      status: "warning",
      severity: "medium",
      detail: "Content-Security-Policy header is missing.",
    });
  } else {
    const lowerCsp = csp.toLowerCase();
    const hasUnsafeInline = lowerCsp.includes("'unsafe-inline'") || lowerCsp.includes("unsafe-inline");
    const hasUnsafeEval = lowerCsp.includes("'unsafe-eval'") || lowerCsp.includes("unsafe-eval");
    // Wildcard * without nonce or hash
    const hasWildcard = /\s\*\s|\s\*$|^\*\s|;\s*\*\s|;\s*\*$/.test(lowerCsp) || lowerCsp.split(/\s+/).includes("*");
    const hasNonceOrHash = /'nonce-[a-z0-9+/=]+'|'sha(256|384|512)-[a-z0-9+/=]+'/i.test(lowerCsp);

    if (hasUnsafeInline || hasUnsafeEval || (hasWildcard && !hasNonceOrHash)) {
      const reasons: string[] = [];
      if (hasUnsafeInline) reasons.push("unsafe-inline");
      if (hasUnsafeEval) reasons.push("unsafe-eval");
      if (hasWildcard && !hasNonceOrHash) reasons.push("wildcard without nonce/hash");

      findings.push({
        header: "content-security-policy",
        status: "warning",
        severity: "low",
        detail: `Content-Security-Policy contains weak directives: ${reasons.join(", ")}.`,
      });
    }
  }

  // 3. X-Content-Type-Options
  const xcto = norm["x-content-type-options"];
  if (!xcto || xcto.trim().toLowerCase() !== "nosniff") {
    findings.push({
      header: "x-content-type-options",
      status: "warning",
      severity: "low",
      detail: "X-Content-Type-Options header is missing or not set to 'nosniff'.",
    });
  }

  // 4. Clickjacking protection: X-Frame-Options or CSP frame-ancestors
  const xfo = norm["x-frame-options"]?.trim().toUpperCase();
  const hasValidXfo = xfo === "DENY" || xfo === "SAMEORIGIN";
  const hasFrameAncestors = csp !== undefined && /frame-ancestors\s+[^;]+/i.test(csp);

  if (!hasValidXfo && !hasFrameAncestors) {
    findings.push({
      header: "x-frame-options",
      status: "warning",
      severity: "medium",
      detail: "Clickjacking protection missing: neither X-Frame-Options (DENY/SAMEORIGIN) nor CSP frame-ancestors is configured.",
    });
  }

  // 5. Permissions-Policy
  const permissionsPolicy = norm["permissions-policy"];
  if (!permissionsPolicy) {
    findings.push({
      header: "permissions-policy",
      status: "warning",
      severity: "low",
      detail: "Permissions-Policy header is missing.",
    });
  }

  if (findings.length === 0) {
    return {
      status: "passed",
      severity: "info",
      detail: "All standard security headers are present and properly configured.",
      findings: [],
    };
  }

  const hasMediumOrHigher = findings.some((f) => f.severity === "medium" || f.severity === "high");
  return {
    status: "warning",
    severity: hasMediumOrHigher ? "medium" : "low",
    detail: `${findings.length} security header issue(s) detected.`,
    findings,
  };
}

/**
 * Evaluates cookie security attributes (Secure, HttpOnly, SameSite).
 */
export function evaluateCookieSecurity(
  cookies: CookieInput[],
  isHttps: boolean
): CookieSecurityResult {
  const findings: CookieFinding[] = [];

  for (const cookie of cookies) {
    // Check 1: Insecure cookie over HTTPS
    if (isHttps && cookie.secure !== true) {
      findings.push({
        cookieName: cookie.name,
        issue: "insecure",
        detail: `Cookie '${cookie.name}' is missing the Secure attribute over HTTPS.`,
      });
    }

    // Check 2: Sensitive cookie missing HttpOnly
    if (SENSITIVE_COOKIE_REGEX.test(cookie.name) && cookie.httpOnly !== true) {
      findings.push({
        cookieName: cookie.name,
        issue: "missing-httponly",
        detail: `Sensitive cookie '${cookie.name}' is missing the HttpOnly attribute.`,
      });
    }

    // Check 3: SameSite=None without Secure
    if (cookie.sameSite?.toLowerCase() === "none" && cookie.secure !== true) {
      findings.push({
        cookieName: cookie.name,
        issue: "invalid-samesite-none",
        detail: `Cookie '${cookie.name}' has SameSite=None but is missing the Secure attribute.`,
      });
    }
  }

  if (findings.length === 0) {
    return {
      status: "passed",
      severity: "info",
      detail: cookies.length > 0
        ? "All cookie security attributes are properly configured."
        : "No cookies present to evaluate.",
      findings: [],
    };
  }

  // Any missing HttpOnly on auth or invalid SameSite=None or insecure cookie is medium severity warning
  return {
    status: "warning",
    severity: "medium",
    detail: `${findings.length} cookie security attribute issue(s) detected across ${cookies.length} cookie(s).`,
    findings,
  };
}
