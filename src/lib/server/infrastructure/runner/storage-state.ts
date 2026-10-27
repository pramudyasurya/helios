import "server-only";

import type { StorageState } from "@/lib/shared/domain/types";
import { prisma } from "@/lib/server/infrastructure/db/prisma";

const EMPTY_STORAGE_STATE: StorageState = { cookies: [], origins: [] };

function asStorageState(stored: unknown): StorageState {
  if (!stored || typeof stored !== "object") return EMPTY_STORAGE_STATE;

  const cookies =
    "cookies" in stored && Array.isArray(stored.cookies) ? stored.cookies : [];
  const origins =
    "origins" in stored && Array.isArray(stored.origins) ? stored.origins : [];

  return {
    cookies: cookies as StorageState["cookies"],
    origins: origins as StorageState["origins"],
  };
}

export async function loadRunStorageState(
  runId: string,
): Promise<StorageState> {
  const run = await prisma.run.findUnique({
    where: { id: runId },
    select: {
      environment: {
        select: { storageState: true },
      },
    },
  });

  return asStorageState(run?.environment?.storageState);
}
