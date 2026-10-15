import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { AUTH_FILE } from "../playwright.config";

test.use({ storageState: AUTH_FILE });

const stat = (page: Page, label: string) =>
  page.locator("dt", { hasText: new RegExp(`^${label}$`) }).locator("+ dd");

test("métricas: visita pelo QR e toque no Instagram aparecem; visita do operador não conta", async ({
  page,
  browser,
  baseURL,
}, testInfo) => {
  // Fluxo longo no `next dev`: com a máquina ocupada passa dos 30 s padrão.
  test.slow();
  const slug = `metricas-${testInfo.project.name}`;

  // Cliente publicado com Instagram
  await page.goto("/admin/clientes/novo");
  await page.getByLabel("Nome do cliente").fill("Café Medido");
  await page.getByLabel("Segmento").selectOption("food");
  await page.getByLabel("Endereço do Bio Site").fill(slug);
  await page.getByRole("button", { name: "Criar cliente" }).click();
  await expect(page).toHaveURL(/\/briefing$/);
  const clientId = /clientes\/([0-9a-f-]{36})/.exec(page.url())![1];
  await page.getByLabel("Instagram").fill("cafemedido");
  await page.getByRole("button", { name: "Salvar cadastro" }).click();
  await expect(page.getByText("Cadastro salvo.")).toBeVisible();
  await page.goto(`/admin/clientes/${clientId}/site`);
  await page.getByRole("button", { name: "Criar Bio Site" }).click();
  await page.getByLabel("Revisei a prévia e aprovo a publicação").check();
  await page.getByRole("button", { name: "Publicar", exact: true }).click();
  await expect(page.getByText("Publicado.")).toBeVisible();

  // Links de QR e NFC
  const metricsPath = `/admin/clientes/${clientId}/metricas`;
  await page.goto(metricsPath);
  await expect(page.getByLabel("Link do QR code")).toHaveValue(new RegExp(`/${slug}\\?o=qr$`));
  await expect(page.getByLabel("Link para gravar na etiqueta NFC")).toHaveValue(
    new RegExp(`/${slug}\\?o=nfc$`),
  );
  await expect(stat(page, "Visitas")).toHaveText("0");
  await expectNoA11yViolations(page);

  // Visitante anônimo entra pelo QR e toca no Instagram (o site externo é bloqueado no teste)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { defaultBrowserType, ...device } = testInfo.project.use as Record<string, unknown>;
  const visitor = await browser.newContext({
    ...device,
    baseURL,
    storageState: { cookies: [], origins: [] },
  });
  await visitor.route(/instagram\.com/, (route) => route.abort());
  const v = await visitor.newPage();
  await v.goto(`/${slug}?o=qr`);
  await expect(v).toHaveURL(new RegExp(`/${slug}$`)); // a marca do QR sai do endereço
  const popup = v.waitForEvent("popup");
  await v.locator('a[data-track="b:instagram"]').click();
  await (await popup).close();

  await expect(async () => {
    await page.reload();
    await expect(stat(page, "Visitas")).toHaveText("1");
    await expect(stat(page, "Toques em links")).toHaveText("1");
  }).toPass({ timeout: 10_000 });
  const sources = page.getByRole("heading", { name: "De onde vieram as visitas" }).locator("..");
  await expect(sources.getByRole("listitem").filter({ hasText: "QR code" })).toContainText("1");
  const targets = page.getByRole("heading", { name: "Onde tocaram" }).locator("..");
  await expect(targets.getByRole("listitem").first()).toContainText("1");
  await expectNoA11yViolations(page);

  // O operador logado abrindo o próprio Bio Site não conta
  await page.goto(`/${slug}`);
  await page.goto(metricsPath);
  await expect(stat(page, "Visitas")).toHaveText("1");

  // Limpeza
  await visitor.close();
  await page.goto(`/admin/clientes/${clientId}`);
  await page.getByLabel(/Para confirmar/).fill(slug);
  await page.getByRole("button", { name: "Excluir cliente definitivamente" }).click();
  await expect(page).toHaveURL(/\/admin$/);
});

async function expectNoA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
}
