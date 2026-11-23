import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run against the production build (`vite preview`), which
 * proxies /api to DAWGHWA_API (default http://localhost:3100). Start the API
 * first. Tests that need live catalogue data skip when the API is unreachable.
 */
// PROD_URL switches to the post-merge production smoke (e2e/prod-smoke.spec.ts only, no local server).
const prod = process.env.PROD_URL;

export default defineConfig({
  testDir: "e2e",
  ...(prod ? { testMatch: /prod-smoke\.spec\.ts$/ } : {}),
  timeout: 45_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: prod ?? "http://localhost:4173", serviceWorkers: "block", trace: "retain-on-failure" },
  webServer: prod ? undefined : { command: "npx vite preview --port 4173 --strictPort", url: "http://localhost:4173", reuseExistingServer: true, timeout: 60_000 },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"], browserName: "chromium" } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
  ],
});
