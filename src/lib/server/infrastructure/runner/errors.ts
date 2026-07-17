import "server-only";
import { PAGE_GOTO_TIMEOUT_MS } from "@/lib/shared/domain/constants";

type PlaywrightErrorPattern = {
  patterns: string[];
  message: string;
};

const PLAYWRIGHT_ERROR_PATTERNS: PlaywrightErrorPattern[] = [
  {
    patterns: ["ERR_NAME_NOT_RESOLVED"],
    message:
      "The submitted domain could not be resolved. Check the URL or DNS configuration.",
  },
  {
    patterns: ["ERR_CERT", "SSL"],
    message:
      "The page could not be opened because of an SSL or certificate error.",
  },
  {
    patterns: ["ERR_CONNECTION_REFUSED"],
    message: "The target server refused the browser connection.",
  },
  {
    patterns: ["ERR_CONNECTION_TIMED_OUT"],
    message:
      "The target server did not respond before the connection timed out.",
  },
  {
    patterns: ["ERR_ABORTED", "net::ERR_BLOCKED"],
    message:
      "The navigation was aborted or blocked before Helios could inspect the page.",
  },
];

export function getPlaywrightErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "Playwright failed with an unknown error.";
  }

  const message = error.message;

  if (message.includes("Timeout")) {
    return `Playwright timed out after ${PAGE_GOTO_TIMEOUT_MS / 1000}s while opening the submitted URL.`;
  }

  const knownError = PLAYWRIGHT_ERROR_PATTERNS.find(({ patterns }) =>
    patterns.some((pattern) => message.includes(pattern)),
  );

  return knownError?.message ?? message;
}
