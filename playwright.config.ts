import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

// Ambiente isolado de teste: banco PGlite e arquivos próprios, credenciais fictícias.
export const E2E_ADMIN = { email: "operador@teste.local", password: "senha-de-teste-123" };
/** Sessão salva pelo projeto "setup" (e2e/auth.setup.ts). */
export const AUTH_FILE = ".data/e2e/auth.json";

const e2eEnv = {
  DATABASE_URL: "",
  PGLITE_DIR: ".data/e2e/pglite",
  STORAGE_DIR: ".data/e2e/storage",
  BETTER_AUTH_SECRET: "e2e-secret-nao-usar-em-producao-0123456789",
  BETTER_AUTH_URL: baseURL,
  PUBLIC_URL: baseURL,
  ADMIN_EMAIL: E2E_ADMIN.email,
  ADMIN_PASSWORD: E2E_ADMIN.password,
  // IA simulada: os testes nunca chamam a API da Claude (nem com chave no .env.local).
  AI_FAKE: "1",
  ANTHROPIC_API_KEY: "",
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
    { name: "setup", testMatch: /.*\.setup\.ts/ },
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, dependencies: ["setup"] },
    { name: "mobile", use: { ...devices["Pixel 7"] }, dependencies: ["setup"] },
  ],
  webServer: {
    command: `npx tsx scripts/e2e-prepare.ts && npx next dev --port ${PORT}`,
    url: `${baseURL}/login`,
    env: e2eEnv,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
