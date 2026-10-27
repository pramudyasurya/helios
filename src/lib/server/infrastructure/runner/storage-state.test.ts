import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({ findUnique: vi.fn() }));

vi.mock("@/lib/server/infrastructure/db/prisma", () => ({
  prisma: { run: { findUnique: prismaMock.findUnique } },
}));

import { loadRunStorageState } from "@/lib/server/infrastructure/runner/storage-state";

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

beforeEach(() => {
  prismaMock.findUnique.mockReset();
});

describe("loadRunStorageState", () => {
  it("returns an empty state when the run does not exist", async () => {
    prismaMock.findUnique.mockResolvedValueOnce(null);

    await expect(loadRunStorageState("run-1")).resolves.toEqual({
      cookies: [],
      origins: [],
    });
  });

  it("returns an empty state when the run has no environment", async () => {
    prismaMock.findUnique.mockResolvedValueOnce({ environment: null });

    await expect(loadRunStorageState("run-1")).resolves.toEqual({
      cookies: [],
      origins: [],
    });
  });

  it("returns an empty state when the column is null", async () => {
    prismaMock.findUnique.mockResolvedValueOnce({
      environment: { storageState: null },
    });

    await expect(loadRunStorageState("run-1")).resolves.toEqual({
      cookies: [],
      origins: [],
    });
  });

  it("returns an empty state when the column holds a non-object", async () => {
    prismaMock.findUnique.mockResolvedValueOnce({
      environment: { storageState: "not-an-object" },
    });

    await expect(loadRunStorageState("run-1")).resolves.toEqual({
      cookies: [],
      origins: [],
    });
  });

  it("returns an empty state when cookies and origins are absent", async () => {
    prismaMock.findUnique.mockResolvedValueOnce({
      environment: { storageState: { something: "else" } },
    });

    await expect(loadRunStorageState("run-1")).resolves.toEqual({
      cookies: [],
      origins: [],
    });
  });

  it("returns the stored session when fully populated", async () => {
    const stored = {
      cookies: [cookie],
      origins: [
        {
          origin: "https://app.example.com",
          localStorage: [{ name: "token", value: "jwt" }],
        },
      ],
    };
    prismaMock.findUnique.mockResolvedValueOnce({
      environment: { storageState: stored },
    });

    await expect(loadRunStorageState("run-1")).resolves.toEqual(stored);
  });

  it("selects only the environment storage state", async () => {
    prismaMock.findUnique.mockResolvedValueOnce({ environment: null });

    await loadRunStorageState("run-1");

    expect(prismaMock.findUnique).toHaveBeenCalledWith({
      where: { id: "run-1" },
      select: {
        environment: { select: { storageState: true } },
      },
    });
  });
});
