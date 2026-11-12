import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/ui",
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    browserName: "chromium",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium-1600x1000", use: { viewport: { width: 1600, height: 1000 } } },
    { name: "chromium-1440x900", use: { viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: "pnpm preview --host 127.0.0.1 --port 4173 --strictPort",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
