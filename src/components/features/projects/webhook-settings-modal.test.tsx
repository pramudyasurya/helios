import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WebhookSettingsModal } from "./webhook-settings-modal";
import type { EnvironmentDto } from "@/lib/client/api";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
let container: HTMLDivElement | undefined;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
});

const mockEnv: EnvironmentDto = {
  id: "env-1",
  projectId: "proj-1",
  name: "Production",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  webhooks: [
    {
      id: "wh-1",
      provider: "discord",
      url: "https://discord.com/api/webhooks/test",
      triggers: ["on_failure"],
      enabled: true,
    },
  ],
};

describe("WebhookSettingsModal", () => {
  it("renders configured webhooks for the environment", () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root?.render(
        <WebhookSettingsModal
          isOpen={true}
          onClose={vi.fn()}
          onSave={vi.fn()}
          environment={mockEnv}
        />,
      );
    });

    expect(container.textContent).toContain("Webhook Alerting");
    expect(container.textContent).toContain("Production");
    expect(container.textContent).toContain("https://discord.com/api/webhooks/test");
    expect(container.textContent).toContain("discord");
    expect(container.textContent).toContain("Active");
  });

  it("allows removing a webhook", () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root?.render(
        <WebhookSettingsModal
          isOpen={true}
          onClose={vi.fn()}
          onSave={vi.fn()}
          environment={mockEnv}
        />,
      );
    });

    const removeBtn = container.querySelector(
      'button[aria-label="Remove webhook wh-1"]',
    );
    expect(removeBtn).not.toBeNull();

    act(() => {
      removeBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).toContain("No webhooks configured");
  });

  it("calls onSave when Save Webhooks is clicked", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root?.render(
        <WebhookSettingsModal
          isOpen={true}
          onClose={vi.fn()}
          onSave={onSave}
          environment={mockEnv}
        />,
      );
    });

    const saveBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.includes("Save Webhooks"),
    );
    expect(saveBtn).toBeDefined();

    await act(async () => {
      saveBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onSave).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: "wh-1",
          provider: "discord",
        }),
      ]),
    );
  });
});
