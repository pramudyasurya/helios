import { beforeEach, describe, expect, it, vi } from "vitest";
import path from "node:path";

const { removeDirectory } = vi.hoisted(() => ({
  removeDirectory: vi.fn(),
}));

vi.mock("node:fs/promises", async (importOriginal) => {
  const filesystem = await importOriginal<typeof import("node:fs/promises")>();

  return {
    ...filesystem,
    rm: removeDirectory,
  };
});

import {
  clearAllRunArtifacts,
  clearRunArtifacts,
} from "@/lib/server/infrastructure/runner/artifacts";

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
