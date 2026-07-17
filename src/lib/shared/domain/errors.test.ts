import { describe, expect, it } from "vitest";
import {
  getRunErrorMessage,
  getErrorMessage,
} from "@/lib/shared/domain/errors";

describe("getRunErrorMessage", () => {
  it("returns the message from Error instances", () => {
    const message = getRunErrorMessage(new Error("Network failed"));

    expect(message).toBe("Network failed");
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
