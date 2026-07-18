import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "./empty.js"),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["src/lib/shared/domain/**/*.test.{ts,tsx}"],
          environment: "node",
        },
      },
      {
        extends: true,
        test: {
          name: "runner",
          include: ["src/lib/server/**/*.test.{ts,tsx}"],
          environment: "node",
        },
      },
      {
        extends: true,
        test: {
          name: "components",
          include: [
                      "src/components/**/*.test.{ts,tsx}",
                      "src/app/**/*.test.{ts,tsx}",
                    ],
          environment: "jsdom",
          setupFiles: ["src/lib/shared/domain/vitest-setup.ts"],
        },
      },
    ],
  },
});
