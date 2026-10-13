import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

// Ambiente isolado de teste: banco PGlite e arquivos próprios, credenciais fictícias.
export const E2E_ADMIN = { email: "operador@teste.local", password: "senha-de-teste-123" };

const e2eEnv = {
  DATABASE_URL: "",
  PGLITE_DIR: ".data/e2e/pglite",
  STORAGE_DIR: ".data/e2e/storage",
  BETTER_AUTH_SECRET: "e2e-secret-nao-usar-em-producao-0123456789",
  BETTER_AUTH_URL: baseURL,
  ADMIN_EMAIL: E2E_ADMIN.email,
  ADMIN_PASSWORD: E2E_ADMIN.password,
};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: { baseURL, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `npx tsx scripts/e2e-prepare.ts && npx next dev --port ${PORT}`,
    url: `${baseURL}/login`,
    env: e2eEnv,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
