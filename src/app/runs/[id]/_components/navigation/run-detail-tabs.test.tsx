import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LatestRun } from "@/lib/shared/domain/types";

const pollingMocks = vi.hoisted(() => ({
  isPending: false,
  refresh: vi.fn(),
  startTransition: vi.fn((callback: () => void) => callback()),
}));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useTransition: () =>
      [pollingMocks.isPending, pollingMocks.startTransition] as const,
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: pollingMocks.refresh }),
}));

vi.mock("@/lib/client/api", () => ({
  updateEvidenceStatus: vi.fn(),
}));

vi.mock("@/app/runs/[id]/_components/overview/run-overview", () => ({
  RunOverview: () => null,
}));
vi.mock("@/app/runs/[id]/_components/evidence/run-evidence-list", () => ({
  RunEvidenceList: () => null,
}));
vi.mock("@/app/runs/[id]/_components/findings/run-checks-list", () => ({
  RunChecksList: () => null,
}));
vi.mock("@/app/runs/[id]/_components/findings/browser-trail", () => ({
  BrowserTrail: () => null,
}));
vi.mock("@/app/runs/[id]/_components/findings/run-findings-summary", () => ({
  RunFindingsSummary: () => null,
}));
vi.mock("@/components/features/ai-report-panel", () => ({
  AIReportPanel: () => null,
}));
vi.mock("@/app/runs/[id]/_components/findings/page-results-tab", () => ({
  PageResultsTab: () => null,
}));
vi.mock("@/app/runs/[id]/_components/navigation/run-detail-sidebar", () => ({
  RunDetailSidebar: () => null,
}));

import { RunDetailTabs } from "@/app/runs/[id]/_components/navigation/run-detail-tabs";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let root: Root | undefined;
let container: HTMLDivElement | undefined;

const activeRun: LatestRun = {
  id: "run-1",
  startingUrl: "https://example.com",
  status: "Running",
  summary: "Running",
  trail: [],
  checks: [],
  createdAt: "2026-07-30T00:00:00.000Z",
};

function renderRunDetail() {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);

  act(() => {
    root?.render(<RunDetailTabs run={activeRun} />);
  });
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
  pollingMocks.isPending = false;
  pollingMocks.refresh.mockReset();
  pollingMocks.startTransition.mockClear();
  vi.useRealTimers();
});

describe("RunDetailTabs polling", () => {
  it("does not start another refresh while a previous refresh transition is pending", () => {
    vi.useFakeTimers();
    pollingMocks.isPending = true;
    renderRunDetail();

    act(() => {
      vi.advanceTimersByTime(3_000);
    });

    expect(pollingMocks.refresh).not.toHaveBeenCalled();
  });

  it("starts an active-run refresh through a transition", () => {
    vi.useFakeTimers();
    renderRunDetail();

    act(() => {
      vi.advanceTimersByTime(3_000);
    });

    expect(pollingMocks.startTransition).toHaveBeenCalledOnce();
    expect(pollingMocks.refresh).toHaveBeenCalledOnce();
  });
});
