import { describe, expect, it } from "vitest";
import { getQARunJobMeta } from "@/lib/server/infrastructure/queue/qa-jobs";

describe("getQARunJobMeta", () => {
  it.each([
    [0, 2],
    [1, 2],
    [2, 2],
  ])("preserves retry metadata for attempt %i of %i", (retryCount, retryLimit) => {
    expect(
      getQARunJobMeta({ retryCount, retryLimit } as Parameters<typeof getQARunJobMeta>[0]),
    ).toEqual({ retryCount, retryLimit });
  });
});
