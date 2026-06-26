import { describe, expect, it } from "vitest";
import { isValidHttpUrl } from "@/lib/helios/shared/validators";

describe("isValidHttpUrl", () => {
  it("accepts http and https URL", () => {
    expect(isValidHttpUrl("http://www.example.com")).toBe(true);
    expect(isValidHttpUrl("https://www.example.com")).toBe(true);
  });

  it("rejects invalid URLs", () => {
    expect(isValidHttpUrl("zzz.example.com")).toBe(false);
  });

  it("rejects non-http protocol", () => {
    expect(isValidHttpUrl("ftp://example.com")).toBe(false);
  });
});
