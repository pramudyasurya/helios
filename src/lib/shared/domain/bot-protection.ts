import type { BotChallengeKind } from "@/lib/shared/domain/types";

const BOT_CHALLENGE_HEADERS = ["cf-mitigated", "x-amzn-waf-action"] as const;

const CHALLENGE_KIND_BY_VALUE: Record<string, BotChallengeKind> = {
  challenge: "challenge",
  captcha: "captcha",
  block: "block",
  human: "challenge",
  interstitial: "challenge",
};

const LOGIN_PATH_PATTERNS = [
  /\/login\b/i,
  /\/log-in\b/i,
  /\/signin\b/i,
  /\/sign-in\b/i,
  /\/sign_in\b/i,
  /\/auth\b/i,
  /\/sso\b/i,
  /\/oauth\b/i,
  /\/session\/new\b/i,
  /\/users\/sign_in\b/i,
  /\/account\/login\b/i,
];

const LOGIN_QUERY_PARAMS = [
  "next",
  "redirect",
  "redirect_uri",
  "returnto",
  "return_to",
  "continue",
  "returnurl",
];

function headerValue(
  headers: Record<string, string> | undefined,
  name: string,
): string | undefined {
  if (!headers) return undefined;

  const direct = headers[name];
  if (direct !== undefined) return direct;

  const match = Object.entries(headers).find(
    ([key]) => key.toLowerCase() === name,
  );
  return match?.[1];
}

/**
 * Cloudflare and AWS WAF both signal a challenge through a response header that
 * is present regardless of status code, so a 200 interstitial is detectable.
 */
export function detectBotChallenge(
  headers: Record<string, string> | undefined,
): BotChallengeKind | undefined {
  for (const name of BOT_CHALLENGE_HEADERS) {
    const value = headerValue(headers, name)?.toLowerCase().trim();
    if (!value) continue;

    const tokens = value.split(",").map((part) => part.trim());
    for (const token of tokens) {
      const kind = CHALLENGE_KIND_BY_VALUE[token];
      if (kind) return kind;
    }
  }

  return undefined;
}

function parseUrl(raw: string | undefined): URL | undefined {
  if (!raw) return undefined;
  try {
    return new URL(raw);
  } catch {
    return undefined;
  }
}

/**
 * A request that lands on a login path it did not start on means the stored
 * session was rejected. Treated as its own failure so it is never mistaken for
 * a page-load error.
 */
export function isLoginRedirect(
  requestedUrl: string | undefined,
  finalUrl: string | undefined,
): boolean {
  const requested = parseUrl(requestedUrl);
  const final = parseUrl(finalUrl);
  if (!requested || !final) return false;

  if (requested.href === final.href) return false;

  const requestedPath = requested.pathname.toLowerCase();
  const finalPath = final.pathname.toLowerCase();
  if (requestedPath === finalPath && requested.host === final.host) {
    return false;
  }

  if (LOGIN_PATH_PATTERNS.some((pattern) => pattern.test(requestedPath))) {
    return false;
  }

  if (LOGIN_PATH_PATTERNS.some((pattern) => pattern.test(finalPath))) {
    return true;
  }

  if (requested.host !== final.host) return false;

  for (const key of final.searchParams.keys()) {
    if (LOGIN_QUERY_PARAMS.includes(key.toLowerCase())) return true;
  }

  return false;
}
