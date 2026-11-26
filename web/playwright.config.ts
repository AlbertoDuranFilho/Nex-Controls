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
    // Sem RESEND_API_KEY os e-mails (pedido, contato) são só simulados no console.
    env: {
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
      REVALIDATE_SECRET: "e2e-revalidar",
      RESEND_API_KEY: "",
      // NF-e automática contra a Mainô falsa (e2e/maino-falso.ts).
      FEATURE_NFE_AUTOMATICA: "true",
      MAINO_API_URL: "http://127.0.0.1:4010/api/v2",
      MAINO_APPLICATION_UID: "e2e-uid",
      MAINO_EMAIL: "e2e@maino.test",
      MAINO_SENHA: "e2e-senha",
    },
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
});
