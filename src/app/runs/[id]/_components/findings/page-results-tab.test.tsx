import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { PageResultsTab } from "@/app/runs/[id]/_components/findings/page-results-tab";
import type { PageResult } from "@/lib/shared/domain/types";

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

function renderPageResultsTab(pageResults: PageResult[]) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);

  act(() => {
    root?.render(<PageResultsTab pageResults={pageResults} />);
  });

  return container;
}

describe("PageResultsTab", () => {
  it("renders Completed status badge for both uppercase 'Completed' and lowercase 'completed'", () => {
    const pageResults: PageResult[] = [
      {
        id: "page-1",
        url: "https://example.com/page1",
        depth: 0,
        status: "Completed",
        statusCode: 200,
        createdAt: "2026-07-28T00:00:00Z",
        updatedAt: "2026-07-28T00:00:00Z",
      },
      {
        id: "page-2",
        url: "https://example.com/page2",
        depth: 1,
        status: "completed",
        statusCode: 200,
        createdAt: "2026-07-28T00:00:00Z",
        updatedAt: "2026-07-28T00:00:00Z",
      },
      {
        id: "page-3",
        url: "https://example.com/page3",
        depth: 1,
        status: "Failed",
        statusCode: 500,
        createdAt: "2026-07-28T00:00:00Z",
        updatedAt: "2026-07-28T00:00:00Z",
      },
    ];

    const rendered = renderPageResultsTab(pageResults);
    const textContent = rendered.textContent || "";

    expect(textContent).toContain("Crawled Pages (3)");
    
    // Select all status badges
    const statusBadges = Array.from(rendered.querySelectorAll("span")).filter(
      (el) => el.textContent === "Completed" || el.textContent === "Failed"
    );

    // Page 1 ("Completed") and Page 2 ("completed") should both render "Completed"
    expect(statusBadges[0].textContent).toBe("Completed");
    expect(statusBadges[1].textContent).toBe("Completed");
    expect(statusBadges[2].textContent).toBe("Failed");
  });
});
