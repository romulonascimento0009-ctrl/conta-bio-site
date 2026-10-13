import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { E2E_ADMIN } from "../playwright.config";

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
}

test("painel sem sessão redireciona para o login", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login$/);
});

test("cookie de sessão falso não abre o painel", async ({ page, context, baseURL }) => {
  await context.addCookies([
    { name: "better-auth.session_token", value: "falso.falso", url: baseURL! },
  ]);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login$/);
});

test("página de login sem violações de acessibilidade", async ({ page }) => {
  await page.goto("/login");
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});

test("senha errada mostra erro e permanece no login", async ({ page }) => {
  await login(page, E2E_ADMIN.email, "senha-errada-123");
  // Escopo no formulário: o Next também injeta um role="alert" (anunciador de rotas).
  await expect(page.locator("form").getByRole("alert")).toHaveText("E-mail ou senha incorretos.");
  await expect(page).toHaveURL(/\/login$/);
});

test("login correto abre o painel e sair encerra a sessão", async ({ page }) => {
  await login(page, E2E_ADMIN.email, E2E_ADMIN.password);
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Clientes" })).toBeVisible();

  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login$/);
});

test("bloqueia tentativas de login em excesso", async ({ request }, testInfo) => {
  // IP fictício exclusivo por projeto para não afetar os outros testes.
  const headers = { "x-forwarded-for": `203.0.113.${testInfo.project.name === "mobile" ? 2 : 1}` };
  const statuses: number[] = [];
  for (let i = 0; i < 6; i++) {
    const res = await request.post("/api/auth/sign-in/email", {
      headers,
      data: { email: E2E_ADMIN.email, password: "senha-errada-123" },
    });
    statuses.push(res.status());
  }
  expect(statuses.slice(0, 5)).not.toContain(429);
  expect(statuses[5]).toBe(429);
});

test("cadastro público está desativado", async ({ request }) => {
  const res = await request.post("/api/auth/sign-up/email", {
    data: { name: "Intruso", email: "intruso@teste.local", password: "outra-senha-123" },
  });
  expect(res.ok()).toBe(false);
});
