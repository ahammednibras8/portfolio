import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

const envFile = new URL(".env", import.meta.url);
if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

const siteURL = process.env.SITE_URL;
if (!siteURL) {
  throw new Error(
    "Set SITE_URL in .env or the environment before running browser tests.",
  );
}

const isCI = Boolean(process.env.CI);
const baseURL = "http://127.0.0.1:4322";
const pagesCommand =
  "pnpm exec wrangler pages dev dist --ip 127.0.0.1 --port 4322 --log-level error --show-interactive-dev-session false";
const useExistingBuild = process.env.PLAYWRIGHT_USE_EXISTING_BUILD === "true";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  outputDir: "test-results",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  ...(isCI ? { workers: 1 } : {}),
  reporter: isCI
    ? [
        ["github"],
        ["html", { open: "never" }],
        ["json", { outputFile: "test-results/playwright.json" }],
      ]
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
      ? pagesCommand
      : `pnpm run build && ${pagesCommand}`,
    url: baseURL,
    env: {
      SITE_URL: siteURL,
    },
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
