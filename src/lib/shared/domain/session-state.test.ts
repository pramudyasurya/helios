import { describe, expect, it } from "vitest";

import { hasSession, type StorageState } from "@/lib/shared/domain/types";

const cookie = {
  name: "session",
  value: "abc",
  domain: "app.example.com",
  path: "/",
  expires: 1_900_000_000,
  httpOnly: true,
  secure: true,
  sameSite: "Lax" as const,
};

describe("hasSession", () => {
  it("treats a missing state as anonymous", () => {
    expect(hasSession(undefined)).toBe(false);
  });

  it("treats a fully empty state as anonymous", () => {
    expect(hasSession({ cookies: [], origins: [] })).toBe(false);
  });

  it("detects a cookie-based session", () => {
    expect(hasSession({ cookies: [cookie], origins: [] })).toBe(true);
  });

  it("detects a localStorage-only session with no cookies", () => {
    const state: StorageState = {
      cookies: [],
      origins: [
        {
          origin: "https://app.example.com",
          localStorage: [{ name: "token", value: "jwt" }],
        },
      ],
    };

    expect(hasSession(state)).toBe(true);
  });

  it("ignores origins that carry no localStorage entries", () => {
    const state: StorageState = {
      cookies: [],
      origins: [{ origin: "https://app.example.com", localStorage: [] }],
    };

    expect(hasSession(state)).toBe(false);
  });
});
