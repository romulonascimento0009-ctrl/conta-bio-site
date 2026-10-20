import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { AUTH_FILE } from "../playwright.config";

test.use({ storageState: AUTH_FILE });

// IA simulada (AI_FAKE=1 no playwright.config): resposta fixa, sem chamar a API nem gastar.
test("IA: montar a partir do cadastro mostra a proposta, barra o link inventado e aplica no rascunho", async ({
  page,
  isMobile,
}, testInfo) => {
  test.slow();
  const slug = `ia-${testInfo.project.name}`;
  await page.goto("/admin/clientes/novo");
  await page.getByLabel("Nome do cliente").fill("Parque IA");
  await page.getByLabel("Segmento").selectOption("services");
  await page.getByLabel("Endereço do Bio Site").fill(slug);
  await page.getByRole("button", { name: "Criar cliente" }).click();
  await expect(page).toHaveURL(/\/briefing$/);
  const clientId = /clientes\/([0-9a-f-]{36})/.exec(page.url())![1];
  await page.getByLabel("WhatsApp").fill("85 99999-8888");
  await page.getByRole("button", { name: "Salvar cadastro" }).click();
  await expect(page.getByText("Cadastro salvo.")).toBeVisible();
  await page.goto(`/admin/clientes/${clientId}/site`);
  await page.getByRole("button", { name: "Criar Bio Site" }).click();
  await expect(page.getByText("Ainda não publicado.")).toBeVisible();

  await page.goto(`/admin/clientes/${clientId}/editor`);
  await page.getByRole("tab", { name: "IA", exact: true }).click();
  await expect(page.getByText(/Gasto com IA neste mês/)).toBeVisible();
  await page.getByRole("button", { name: "Montar com IA" }).click();

  const proposal = page.getByRole("region", { name: "Proposta da IA (veja na prévia)" });
  await expect(proposal).toContainText("montados a partir do cadastro");
  await expect(proposal).toContainText(
    "Novo cartão “Link inventado”: link que não está no cadastro",
  );
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);

  // A prévia mostra a proposta; o rascunho só muda ao aplicar
  const preview = page.locator(".editor-preview");
  if (isMobile) await page.getByRole("button", { name: "Prévia", exact: true }).click();
  await expect(preview.locator(".bio-tagline")).toHaveText("Slogan criado pela IA");
  await expect(preview).toContainText("Prévia da proposta da IA");
  if (isMobile) await page.getByRole("button", { name: "Editar", exact: true }).click();
  await expect(page.getByRole("button", { name: "Rascunho salvo" })).toBeVisible();

  await proposal.getByRole("button", { name: "Aplicar no rascunho" }).click();
  await expect(proposal).toHaveCount(0);
  await page.getByRole("button", { name: "Salvar rascunho" }).click();
  await expect(page.getByRole("button", { name: "Rascunho salvo" })).toBeVisible();
  await expect(preview.locator(".bio-tagline")).toHaveText("Slogan criado pela IA");

  // Pedido em linguagem natural; descartar não muda nada
  await page.getByLabel("O que você quer mudar?").fill("Deixe o slogan mais curto");
  await page.getByRole("button", { name: "Pedir à IA" }).click();
  await expect(proposal).toContainText("Pedido atendido");
  await proposal.getByRole("button", { name: "Descartar" }).click();
  await expect(preview.locator(".bio-tagline")).toHaveText("Slogan criado pela IA");

  // Registro na atividade do cliente
  await page.goto(`/admin/clientes/${clientId}/atividade`);
  await expect(page.getByText("Pedido à IA (prévia)").first()).toBeVisible();
});
