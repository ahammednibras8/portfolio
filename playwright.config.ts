import { defineConfig, devices } from "@playwright/test";

const isCI = Boolean(process.env.CI);
const baseURL = "http://127.0.0.1:4321";
const previewCommand =
  "pnpm run preview --host 127.0.0.1 --port 4321 --ignore-lock";
const useExistingBuild = process.env.PLAYWRIGHT_USE_EXISTING_BUILD === "true";

export default defineConfig({
  testDir: "./tests",
  outputDir: "test-results",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  ...(isCI ? { workers: 1 } : {}),
  reporter: isCI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],

  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ],

  webServer: {
    command: useExistingBuild
      ? previewCommand
      : `pnpm run build && ${previewCommand}`,
    url: baseURL,
    env: {
      SITE_URL: process.env.SITE_URL ?? "https://example.com",
    },
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
