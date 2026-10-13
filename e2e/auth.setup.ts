import { expect, test as setup } from "@playwright/test";
import { AUTH_FILE, E2E_ADMIN } from "../playwright.config";

// Um único login, por API e com IP fictício próprio, reaproveitado pelos testes do painel
// (evita esbarrar no rate limit de 5 logins/min).
setup("autenticar operador", async ({ request, baseURL }) => {
  const res = await request.post("/api/auth/sign-in/email", {
    headers: { "x-forwarded-for": "203.0.113.50", origin: baseURL! },
    data: E2E_ADMIN,
  });
  expect(res.ok()).toBe(true);
  await request.storageState({ path: AUTH_FILE });
});
