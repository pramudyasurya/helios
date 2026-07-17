export function getRunErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "Helios could not complete the browser QA run.";
}

export function getErrorMessage(
  error: unknown,
  fallback = "An unexpected error occurred.",
): string {
  if (error instanceof Error) return error.message;
  return fallback;
}
