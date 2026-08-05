import { NextResponse } from "next/server";

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

/**
 * Narrows an unknown thrown value to a Prisma unique-constraint violation.
 * P2002 is the Prisma error code for unique constraint failures.
 */
export function isPrismaUniqueConstraintError(error: unknown): error is { code: "P2002"; meta?: unknown } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "P2002"
  );
}

/**
 * Returns a 409/400 NextResponse for a Prisma P2002 unique-constraint error,
 * or null if the error is not a unique-constraint violation. Callers should
 * fall through to their generic error handler when this returns null.
 */
export function uniqueConstraintResponse(
  error: unknown,
  message: string,
  status: 400 | 409 = 409,
): NextResponse | null {
  if (!isPrismaUniqueConstraintError(error)) return null;
  return NextResponse.json({ error: message }, { status });
}
