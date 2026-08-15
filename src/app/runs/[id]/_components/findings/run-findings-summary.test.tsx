import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { RunFindingsSummary } from "@/app/runs/[id]/_components/findings/run-findings-summary";
import type { CheckResult } from "@/lib/shared/domain/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let root: Root | undefined;
let container: HTMLDivElement | undefined;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
});

function renderSummary(checks: CheckResult[], newIssueEvidenceIds?: Set<string>) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);

  act(() => {
    root?.render(
      <RunFindingsSummary
        checks={checks}
        showEmptyState
        newIssueEvidenceIds={newIssueEvidenceIds}
      />,
    );
  });

  return container;
}

const consoleFinding = (evidenceIds?: string[]): CheckResult => ({
  title: "Console errors checked",
  detail: "1 console error(s) captured.",
  status: "warning",
  severity: "low",
  evidenceType: "console",
  ...(evidenceIds ? { evidenceIds } : {}),
});

const NEW_ISSUE_BADGE = "New issue · Regression";

describe("RunFindingsSummary new-issue badge", () => {
  it("badges a finding whose evidence belongs to a new issue", () => {
    const rendered = renderSummary(
      [consoleFinding(["ev-new"])],
      new Set(["ev-new"]),
    );

    expect(rendered.textContent).toContain(NEW_ISSUE_BADGE);
  });

  it("does not badge a recurring finding sharing the type with a new issue", () => {
    const rendered = renderSummary(
      [consoleFinding(["ev-recurring"])],
      new Set(["ev-new"]),
    );

    expect(rendered.textContent).not.toContain(NEW_ISSUE_BADGE);
  });

  it("does not badge a finding with no evidence linkage", () => {
    const rendered = renderSummary(
      [consoleFinding()],
      new Set(["ev-new"]),
    );

    expect(rendered.textContent).not.toContain(NEW_ISSUE_BADGE);
  });
});
