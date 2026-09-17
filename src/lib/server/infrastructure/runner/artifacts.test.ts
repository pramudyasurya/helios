import { beforeEach, describe, expect, it, vi } from "vitest";
import path from "node:path";

const { removeDirectory, makeDirectory } = vi.hoisted(() => ({
  removeDirectory: vi.fn(),
  makeDirectory: vi.fn(),
}));

vi.mock("node:fs/promises", async (importOriginal) => {
  const filesystem = await importOriginal<typeof import("node:fs/promises")>();

  return {
    ...filesystem,
    rm: removeDirectory,
    mkdir: makeDirectory,
  };
});

import {
  clearAllRunArtifacts,
  clearRunArtifacts,
  getRunTraceArtifactPath,
  saveRunTrace,
} from "@/lib/server/infrastructure/runner/artifacts";
import type { BrowserContext } from "playwright";

describe("artifacts infrastructure cleanup utilities", () => {
  beforeEach(() => {
    removeDirectory.mockReset();
    removeDirectory.mockResolvedValue(undefined);
  });

  it("removes only the specified run artifact directory", async () => {
    const runId = "test_run_cleanup_123";
    const runDir = path.join(process.cwd(), "public", "artifacts", "runs", runId);

    await clearRunArtifacts(runId);

    expect(removeDirectory).toHaveBeenCalledOnce();
    expect(removeDirectory).toHaveBeenCalledWith(runDir, {
      recursive: true,
      force: true,
    });
  });

  it("removes the complete run artifact directory", async () => {
    const runsDir = path.join(process.cwd(), "public", "artifacts", "runs");

    await clearAllRunArtifacts();

    expect(removeDirectory).toHaveBeenCalledOnce();
    expect(removeDirectory).toHaveBeenCalledWith(runsDir, {
      recursive: true,
      force: true,
    });
  });
});

describe("artifacts trace utilities", () => {
  beforeEach(() => {
    makeDirectory.mockReset();
    makeDirectory.mockResolvedValue(undefined);
  });

  it("returns the expected local path and public URL for a run trace", () => {
    const runId = "run_trace_abc123";
    const result = getRunTraceArtifactPath(runId);

    expect(result.localPath).toBe(
      path.join(process.cwd(), "public", "artifacts", "runs", runId, "trace.zip"),
    );
    expect(result.publicUrl).toBe(`/artifacts/runs/${runId}/trace.zip`);
  });

  it("creates the directory and stops tracing with local file path", async () => {
    const runId = "run_trace_save_456";
    const expectedDir = path.join(process.cwd(), "public", "artifacts", "runs", runId);
    const expectedTracePath = path.join(expectedDir, "trace.zip");

    const mockContext = {
      tracing: {
        stop: vi.fn().mockResolvedValue(undefined),
      },
    } as unknown as BrowserContext;

    const publicUrl = await saveRunTrace({
      context: mockContext,
      runId,
    });

    expect(makeDirectory).toHaveBeenCalledWith(expectedDir, { recursive: true });
    expect(mockContext.tracing.stop).toHaveBeenCalledWith({ path: expectedTracePath });
    expect(publicUrl).toBe(`/artifacts/runs/${runId}/trace.zip`);
  });
});
