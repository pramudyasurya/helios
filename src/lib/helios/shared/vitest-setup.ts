import React from "react";
import { vi } from "vitest";

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

vi.mock("recharts", async (importOriginal) => {
  const original = await importOriginal<typeof import("recharts")>();
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        "div",
        { style: { width: "100%", height: "100%" } },
        React.Children.map(children, (child) =>
          React.isValidElement(child)
            ? React.cloneElement(
                child as React.ReactElement<{
                  width?: number;
                  height?: number;
                }>,
                {
                  width: 800,
                  height: 400,
                },
              )
            : null,
        ),
      ),
  };
});
