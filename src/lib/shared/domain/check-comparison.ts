import type {
  CheckResult,
  CheckStatus,
  LatestRun,
} from "@/lib/shared/domain/types";

export type CheckTransition = {
  title: string;
  from: CheckStatus | null;
  to: CheckStatus | null;
  direction: "regressed" | "improved" | "unchanged" | "added" | "removed";
};

const STATUS_RANK: Record<CheckStatus, number> = {
  passed: 1,
  warning: 2,
  failed: 3,
};

function transitionDirection(
  from: CheckStatus | null,
  to: CheckStatus | null,
): CheckTransition["direction"] {
  if (from === null || to === null) {
    return from === null ? "added" : "removed";
  }
  if (STATUS_RANK[to] > STATUS_RANK[from]) return "regressed";
  if (STATUS_RANK[to] < STATUS_RANK[from]) return "improved";
  return "unchanged";
}

export function compareChecks(a: LatestRun, b: LatestRun): CheckTransition[] {
  const statusByTitleA = new Map(
    a.checks.map((check: CheckResult) => [check.title, check.status]),
  );
  const statusByTitleB = new Map(
    b.checks.map((check: CheckResult) => [check.title, check.status]),
  );

  const titles = new Set<string>();
  for (const title of statusByTitleA.keys()) titles.add(title);
  for (const title of statusByTitleB.keys()) titles.add(title);

  const transitions: CheckTransition[] = [];
  for (const title of titles) {
    const from = statusByTitleA.get(title) ?? null;
    const to = statusByTitleB.get(title) ?? null;
    transitions.push({
      title,
      from,
      to,
      direction: transitionDirection(from, to),
    });
  }

  return transitions.sort((x, y) => x.title.localeCompare(y.title));
}
