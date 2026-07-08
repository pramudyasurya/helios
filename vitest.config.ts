import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    setupFiles: ["src/lib/helios/shared/vitest-setup.ts"],
  },
});
