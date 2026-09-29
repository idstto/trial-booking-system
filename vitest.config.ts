import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    exclude: [...configDefaults.exclude, "tests/e2e/**"],
    globals: true,
    fileParallelism: false,
    setupFiles: ["./tests/setup.ts"],
    sequence: { concurrent: false },
    testTimeout: 15_000,
    hookTimeout: 30_000,
  },
});
