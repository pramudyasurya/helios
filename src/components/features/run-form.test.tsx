import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RunForm } from "@/components/features/run-form";

vi.mock("@/components/features/run-options-picker", () => ({
  RunOptionsPicker: () => null,
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
let container: HTMLDivElement | undefined;

function setElementValue(element: HTMLInputElement | HTMLSelectElement, value: string) {
  const prototype = element instanceof HTMLSelectElement
    ? HTMLSelectElement.prototype
    : HTMLInputElement.prototype;
  const valueSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;

  valueSetter?.call(element, value);
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
  vi.unstubAllGlobals();
});

describe("RunForm project context", () => {
  it("submits the selected Project and Environment and fills an empty URL from the Environment", async () => {
    const onSubmit = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            projects: [
              {
                id: "project-1",
                name: "Storefront",
                slug: "storefront",
                createdAt: "2026-08-02T00:00:00.000Z",
                updatedAt: "2026-08-02T00:00:00.000Z",
                environments: [
                  {
                    id: "environment-1",
                    projectId: "project-1",
                    name: "Staging",
                    baseUrl: "https://staging.example.com",
                    createdAt: "2026-08-02T00:00:00.000Z",
                    updatedAt: "2026-08-02T00:00:00.000Z",
                  },
                ],
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    act(() => {
      root?.render(<RunForm onSubmit={onSubmit} />);
    });
    await act(async () => {
      await Promise.resolve();
    });

    const projectSelect = container.querySelector(
      '[aria-label="Select Project"]',
    ) as HTMLSelectElement;
    act(() => setElementValue(projectSelect, "project-1"));

    const environmentSelect = container.querySelector(
      '[aria-label="Select Environment"]',
    ) as HTMLSelectElement;
    act(() => setElementValue(environmentSelect, "environment-1"));

    const urlInput = container.querySelector("#url-target") as HTMLInputElement;
    expect(urlInput.value).toBe("https://staging.example.com");

    act(() => {
      container?.querySelector("form")?.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
    });

    expect(onSubmit).toHaveBeenCalledWith(
      "https://staging.example.com",
      expect.objectContaining({
        projectId: "project-1",
        environmentId: "environment-1",
        origin: "manual",
      }),
    );
  });
});
