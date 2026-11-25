import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  workers: 1,
  fullyParallel: false,
  reporter: "list",
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3000/pt",
    // O servidor de e2e roda em modo production: a origem do link de e-mail tem de ser explicita.
    env: { NEXT_PUBLIC_SITE_URL: "http://localhost:3000" },
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
});
