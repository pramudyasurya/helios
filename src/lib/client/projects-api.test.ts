import { describe, expect, it, vi } from "vitest";
import {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  createEnvironment,
  updateEnvironment,
  deleteEnvironment,
} from "@/lib/client/api";

describe("Projects Client SDK API", () => {
  it("getProjects fetches list of projects correctly", async () => {
    const mockProjects = [
      {
        id: "proj-1",
        name: "E-Commerce",
        slug: "e-commerce",
        environments: [],
        createdAt: "2026-08-01T00:00:00Z",
        updatedAt: "2026-08-01T00:00:00Z",
      },
    ];

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(mockProjects), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const result = await getProjects({ q: "E-Commerce" });
    expect(result).toEqual(mockProjects);
  });

  it("createProject sends POST payload and returns created project", async () => {
    const created = {
      id: "proj-2",
      name: "Dashboard",
      slug: "dashboard",
      environments: [],
      createdAt: "2026-08-01T00:00:00Z",
      updatedAt: "2026-08-01T00:00:00Z",
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(created), {
        status: 201,
        headers: { "content-type": "application/json" },
      }),
    );

    const result = await createProject({ name: "Dashboard" });
    expect(result).toEqual(created);
  });

  it("createEnvironment sends POST payload under project route", async () => {
    const createdEnv = {
      id: "env-1",
      projectId: "proj-1",
      name: "Staging",
      baseUrl: "https://staging.example.com",
      createdAt: "2026-08-01T00:00:00Z",
      updatedAt: "2026-08-01T00:00:00Z",
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(createdEnv), {
        status: 201,
        headers: { "content-type": "application/json" },
      }),
    );

    const result = await createEnvironment("proj-1", {
      name: "Staging",
      baseUrl: "https://staging.example.com",
    });
    expect(result).toEqual(createdEnv);
  });
});
