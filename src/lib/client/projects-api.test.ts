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
  it("getProjects fetches list of projects in { projects: [...] } envelope with stats", async () => {
    const mockResponse = {
      projects: [
        {
          id: "proj-1",
          name: "E-Commerce",
          slug: "e-commerce",
          environments: [],
          createdAt: "2026-08-01T00:00:00Z",
          updatedAt: "2026-08-01T00:00:00Z",
          totalRuns: 12,
          passRate: 83.3,
          lastRunAt: "2026-08-02T14:30:00Z",
        },
      ],
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const result = await getProjects({ q: "E-Commerce" });
    expect(result).toEqual(mockResponse);
    expect(result.projects[0].totalRuns).toBe(12);
    expect(result.projects[0].passRate).toBe(83.3);
    expect(result.projects[0].lastRunAt).toBe("2026-08-02T14:30:00Z");
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

  it("updateEnvironment sends PATCH to environment route with partial payload", async () => {
    const updatedEnv = {
      id: "env-1",
      projectId: "proj-1",
      name: "Staging Updated",
      baseUrl: "https://staging.example.com",
      createdAt: "2026-08-01T00:00:00Z",
      updatedAt: "2026-08-04T00:00:00Z",
    };

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(updatedEnv), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const result = await updateEnvironment("proj-1", "env-1", {
      name: "Staging Updated",
    });
    expect(result).toEqual(updatedEnv);
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/projects/proj-1/environments/env-1",
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("updateEnvironment throws on 409 duplicate name conflict", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: "An environment with this name already exists in this project.",
          message: "An environment with this name already exists in this project.",
        }),
        { status: 409, headers: { "content-type": "application/json" } },
      ),
    );

    await expect(
      updateEnvironment("proj-1", "env-1", { name: "Duplicate" }),
    ).rejects.toMatchObject({ error: expect.stringContaining("already exists") });
  });

  it("deleteEnvironment sends DELETE to environment route and returns success", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, deletedId: "env-1" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const result = await deleteEnvironment("proj-1", "env-1");
    expect(result).toEqual({ success: true, deletedId: "env-1" });
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/projects/proj-1/environments/env-1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("deleteEnvironment throws on 404 missing environment", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({ error: "Environment not found", message: "Environment not found" }),
        { status: 404, headers: { "content-type": "application/json" } },
      ),
    );

    await expect(deleteEnvironment("proj-1", "missing-env")).rejects.toMatchObject({
      error: "Environment not found",
    });
  });

});
