import { describe, expect, it } from "vitest";
import {
  getRunErrorMessage,
  getErrorMessage,
  sanitizeErrorMessage,
} from "@/lib/shared/domain/errors";

describe("sanitizeErrorMessage", () => {
  it("sanitizes raw Turbopack module invocation errors", () => {
    const raw =
      'Invalid `__TURBOPACK__imported__module__$5b$project$5d2f$src... prisma.run.create() invocation in C:\\College\\...';
    const result = sanitizeErrorMessage(raw, "An unexpected error occurred.");
    expect(result).toBe(
      "Database connection unavailable. Please verify PostgreSQL is running.",
    );
  });

  it("sanitizes ECONNREFUSED database errors", () => {
    const raw = "PrismaClientInitializationError: connect ECONNREFUSED 127.0.0.1:5432";
    const result = sanitizeErrorMessage(raw, "An unexpected error occurred.");
    expect(result).toBe(
      "Database connection unavailable. Please verify PostgreSQL is running.",
    );
  });

  it("preserves safe domain error messages", () => {
    const raw = "Please enter a valid HTTP or HTTPS URL.";
    expect(sanitizeErrorMessage(raw, "Fallback")).toBe(raw);
  });
});

describe("getRunErrorMessage", () => {
  it("returns the message from Error instances", () => {
    const message = getRunErrorMessage(new Error("Network failed"));

    expect(message).toBe("Network failed");
  });

  it("sanitizes internal Turbopack errors in Error instances", () => {
    const message = getRunErrorMessage(
      new Error(
        "Invalid `__TURBOPACK__imported__module__... prisma.run.create()",
      ),
    );

    expect(message).toBe(
      "Database connection unavailable. Please verify PostgreSQL is running.",
    );
  });

  it("returns the message from object-like errors", () => {
    const message = getRunErrorMessage({ message: "Network failed" });

    expect(message).toBe("Network failed");
  });

  it("returns the default message", () => {
    const message = getRunErrorMessage({});

    expect(message).toBe("Helios could not complete the browser QA run.");
  });
});

describe("getErrorMessage", () => {
  it("returns the message from Error instances", () => {
    expect(getErrorMessage(new Error("Network failed"))).toBe("Network failed");
  });

  it("returns the default fallback message", () => {
    expect(getErrorMessage({})).toBe("An unexpected error occurred.");
  });

  it("returns the custom fallback message", () => {
    expect(getErrorMessage({}, "Custom fallback")).toBe("Custom fallback");
  });
});
