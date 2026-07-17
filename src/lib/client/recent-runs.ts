import type { LatestRun } from "@/lib/shared/domain/types";
import {
  MAX_RECENT_RUNS,
} from "@/lib/shared/domain/constants";

export function addRecentRun(
  currentRuns: LatestRun[],
  run: LatestRun,
): LatestRun[] {
  return [
    run,
    ...currentRuns.filter((currentRun) => currentRun.id !== run.id),
  ].slice(0, MAX_RECENT_RUNS);
}