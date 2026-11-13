import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Node is the default; component tests switch to jsdom per file with
    // a `// @vitest-environment jsdom` docblock.
    environment: "node",
    // CLI/token tests live in tests/; component tests sit next to their source.
    include: ["tests/**/*.test.ts", "src/**/*.test.{ts,tsx}"],
    setupFiles: ["tests/setup/vitest.setup.ts"],
  },
});
