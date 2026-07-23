const INTERNAL_ERROR_PATTERNS = [
  /__TURBOPACK__/i,
  /prisma/i,
  /ECONNREFUSED/i,
  /Can't reach database/i,
  /invocation in/i,
  /[A-Z]:\\[^\n]+/i, // Windows absolute paths
  /\/\.next\//i,     // Next.js build paths
];

export function sanitizeErrorMessage(rawMessage: string, fallback: string): string {
  if (!rawMessage || typeof rawMessage !== "string") {
    return fallback;
  }

  const isInternalError = INTERNAL_ERROR_PATTERNS.some((pattern) =>
    pattern.test(rawMessage),
  );

  if (isInternalError) {
    if (
      /prisma|database|ECONNREFUSED|Can't reach/i.test(rawMessage)
    ) {
      return "Database connection unavailable. Please verify PostgreSQL is running.";
    }
    return fallback;
  }

  return rawMessage;
}

export function getRunErrorMessage(error: unknown): string {
  const fallback = "Helios could not complete the browser QA run.";

  if (error instanceof Error) {
    return sanitizeErrorMessage(error.message, fallback);
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return sanitizeErrorMessage(error.message, fallback);
  }

  return fallback;
}

export function getErrorMessage(
  error: unknown,
  fallback = "An unexpected error occurred.",
): string {
  if (error instanceof Error) {
    return sanitizeErrorMessage(error.message, fallback);
  }
  return fallback;
}
