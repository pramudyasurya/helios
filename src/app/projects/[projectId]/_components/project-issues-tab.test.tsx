import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProjectIssuesTab } from "./project-issues-tab";
import type { ProjectDetailDto } from "@/lib/client/api";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
let container: HTMLDivElement | undefined;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
  vi.restoreAllMocks();
});

const mockProject: ProjectDetailDto = {
  id: "proj-1",
  name: "Portal App",
  slug: "portal-app",
  environments: [
    {
      id: "env-1",
      projectId: "proj-1",
      name: "Staging",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  stats: {
    totalRuns: 10,
    passedRuns: 8,
    failedRuns: 2,
    passRate: 80,
    lastRunAt: new Date().toISOString(),
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("ProjectIssuesTab", () => {
  it("renders issues list and allows changing issue triage status", async () => {
    const mockIssues = [
      {
        id: "issue-1",
        fingerprint: "fp-1",
        type: "console",
        normalizedMessage: "TypeError: Cannot read properties of undefined",
        firstSeenRunId: "run-11111111",
        lastSeenRunId: "run-22222222",
        occurrences: 4,
        status: "open",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") {
        return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
      }
      return Promise.resolve(
        new Response(JSON.stringify({ issues: mockIssues, total: 1 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(<ProjectIssuesTab project={mockProject} />);
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(container.textContent).toContain("Recurring Issues & Triage");
    expect(container.textContent).toContain("TypeError: Cannot read properties of undefined");
    expect(container.textContent).toContain("4 runs");

    const statusSelect = container.querySelector("select") as HTMLSelectElement;
    expect(statusSelect).not.toBeNull();

    // Select "ignored"
    const issueStatusSelect = container.querySelectorAll("select")[1] as HTMLSelectElement;
    expect(issueStatusSelect).toBeDefined();

    await act(async () => {
      issueStatusSelect.value = "ignored";
      issueStatusSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/issues/issue-1"),
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ status: "ignored" }),
      }),
    );
  });
});
