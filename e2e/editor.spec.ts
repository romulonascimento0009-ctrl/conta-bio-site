import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { AUTH_FILE } from "../playwright.config";

test.use({ storageState: AUTH_FILE });

async function expectNoA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
}

async function publish(page: Page, note: string) {
  await page.getByLabel("Revisei a prévia e aprovo a publicação").check();
  await page.getByLabel("Nota da versão (opcional)").fill(note);
  await page.getByRole("button", { name: "Publicar", exact: true }).click();
  await expect(page.getByText("Publicado.")).toBeVisible();
}

test("editor visual: editar → salvar → aprovar e publicar → restaurar → republicar", async ({
  page,
  isMobile,
}, testInfo) => {
  // Fluxo longo no `next dev`: com a máquina ocupada passa dos 30 s padrão.
  test.slow();
  const slug = `editor-${testInfo.project.name}`;

  // Cliente com Bio Site publicado (versão 1)
  await page.goto("/admin/clientes/novo");
  await page.getByLabel("Nome do cliente").fill("Studio Original");
  await page.getByLabel("Segmento").selectOption("beauty");
  await page.getByLabel("Endereço do Bio Site").fill(slug);
  await page.getByRole("button", { name: "Criar cliente" }).click();
  await expect(page).toHaveURL(/\/briefing$/);
  const clientId = /clientes\/([0-9a-f-]{36})/.exec(page.url())![1];
  await page.getByLabel("Instagram").fill("studio.original");
  await page.getByLabel("WhatsApp").fill("5511977776666");
  await page.getByLabel("Link de avaliação no Google").fill("https://g.page/r/original/review");
  await page.getByRole("button", { name: "Salvar cadastro" }).click();
  await expect(page.getByText("Cadastro salvo.")).toBeVisible();
  await page.goto(`/admin/clientes/${clientId}/site`);
  await page.getByRole("button", { name: "Criar Bio Site" }).click();
  await expect(page.getByText("Ainda não publicado.")).toBeVisible();

  // Publicar exige aprovação explícita
  await page.getByRole("button", { name: "Publicar", exact: true }).click();
  await expect(page.getByText(/Marque “Revisei a prévia/)).toBeVisible();
  await publish(page, "Primeira versão");

  // Editor
  await page.goto(`/admin/clientes/${clientId}/editor`);
  if (isMobile) await page.getByRole("button", { name: "Prévia", exact: true }).click();
  const preview = page.locator(".editor-preview");
  await expect(preview.locator("h1")).toHaveText("Studio Original");

  // Clicar no topo da prévia abre a aba Topo; a prévia muda ao vivo
  await preview.locator('[data-edit="profile"]').click();
  await expect(page.getByRole("tab", { name: "Topo" })).toHaveAttribute("aria-selected", "true");
  await page.getByLabel("Nome", { exact: true }).fill("Studio Editado");

  // Cores do topo: texto ilegível é apontado; o escurecimento muda a prévia ao vivo
  await page.getByLabel("Nome e frase (código)").fill("#1a1a1a");
  await expect(
    page.getByRole("alert").filter({ hasText: "Corrija antes de salvar" }),
  ).toContainText("texto do topo");
  await page.getByLabel("Nome e frase (código)").fill("#ffffff");
  await page.getByLabel("Intensidade do escurecimento").fill("80");
  await expect(preview.locator(".bio")).toHaveAttribute(
    "style",
    /--veil-bottom:\s*rgb\(0 0 0 \/ 0\.95\)/,
  );
  if (isMobile) await page.getByRole("button", { name: "Prévia", exact: true }).click();
  await expect(preview.locator("h1")).toHaveText("Studio Editado");

  // Clicar num cartão da prévia seleciona o bloco; editar o título
  await preview.locator('[data-block-id="instagram"]').click();
  await expect(page.getByRole("tab", { name: "Blocos" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByLabel("Tipo")).toHaveValue("instagram");
  await page.getByLabel("Título", { exact: true }).fill("Siga no Instagram");

  // Cor própria do cartão (código digitado) aparece na prévia
  await page.getByLabel("Cor do cartão").selectOption("custom");
  await page.getByLabel("Topo do degradê (código)").fill("#7b2cbf");
  await expect(preview.locator('a[data-block-id="instagram"]')).toHaveAttribute(
    "style",
    /--card-top:\s*#7b2cbf/,
  );
  await page.getByRole("button", { name: /Mover Avaliar no Google para cima/ }).click();
  const order = () =>
    page.getByRole("list", { name: "Blocos na ordem exibida" }).getByRole("listitem").first();
  await expect(order()).toContainText("Avaliar no Google");

  // Desfazer / refazer
  await page.getByRole("button", { name: "Desfazer" }).click();
  await expect(order()).toContainText("Siga no Instagram");
  await page.getByRole("button", { name: "Refazer" }).click();
  await expect(order()).toContainText("Avaliar no Google");

  // Cores sem contraste bloqueiam o salvamento, com atalho para o problema
  await page.getByRole("tab", { name: "Faixa" }).click();
  await page.getByLabel("Usar cores próprias").check();
  await page.getByLabel("Fundo", { exact: true }).fill("#ffffff");
  await page.getByLabel("Letra", { exact: true }).fill("#eeeeee");
  await expect(
    page.getByRole("alert").filter({ hasText: "Corrija antes de salvar" }),
  ).toContainText("contraste da faixa");
  await expect(page.getByRole("button", { name: "Salvar rascunho" })).toBeDisabled();
  await page.getByLabel("Usar cores próprias").uncheck();

  // Salvar e publicar (publicar fica bloqueado enquanto há alterações não salvas)
  await expect(page.getByText("Salve o rascunho antes de publicar.")).toBeVisible();
  await page.getByRole("button", { name: "Salvar rascunho" }).click();
  await expect(page.getByRole("button", { name: "Rascunho salvo" })).toBeVisible();
  await expectNoA11yViolations(page);
  await publish(page, "Nome novo");

  await page.goto(`/${slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Studio Editado");
  await expect(page.locator(".bio-card strong").first()).toHaveText("Avaliar no Google");

  // Versões: restaurar a primeira no rascunho (o endereço público não muda)
  await page.goto(`/admin/clientes/${clientId}/versoes`);
  await expectNoA11yViolations(page);
  const first = page.getByRole("listitem").filter({ hasText: "Primeira versão" });
  await first.getByRole("button", { name: "Restaurar no rascunho" }).click();
  await expect(first.getByText(/Versão copiada para o rascunho/)).toBeVisible();
  // O rascunho era igual à versão publicada: nenhuma cópia repetida no histórico.
  await page.reload();
  await expect(page.getByText("Rascunho guardado antes de restaurar")).toHaveCount(0);
  await page.goto(`/preview/${clientId}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Studio Original");
  await page.goto(`/${slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Studio Editado");

  // Republicar a primeira versão exige aprovação e volta o endereço público
  await page.goto(`/admin/clientes/${clientId}/versoes`);
  const firstAgain = page.getByRole("listitem").filter({ hasText: "Primeira versão" });
  await firstAgain.getByLabel("Aprovo republicar esta versão").check();
  await firstAgain.getByRole("button", { name: "Republicar esta versão" }).click();
  await expect(firstAgain.getByText("Esta versão está publicada.")).toBeVisible();
  await page.goto(`/${slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Studio Original");

  // Limpeza
  await page.goto(`/admin/clientes/${clientId}`);
  await page.getByLabel(/Para confirmar/).fill(slug);
  await page.getByRole("button", { name: "Excluir cliente definitivamente" }).click();
  await expect(page).toHaveURL(/\/admin$/);
});
