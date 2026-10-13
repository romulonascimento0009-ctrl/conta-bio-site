import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";
import { AUTH_FILE } from "../playwright.config";

test.use({ storageState: AUTH_FILE });

async function expectNoA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
}

/** Forma mínima do documento usada nos testes (o JSON é validado de verdade pelo servidor). */
type DraftDoc = { profile: Record<string, unknown>; blocks: Record<string, unknown>[] };

async function editJson(page: Page, mutate: (doc: DraftDoc) => void) {
  const textarea = page.getByLabel("Documento do Bio Site (JSON)");
  const doc = JSON.parse(await textarea.inputValue());
  mutate(doc);
  await textarea.fill(JSON.stringify(doc, null, 2));
  await page.getByRole("button", { name: "Validar e salvar" }).click();
}

test("fluxo completo: cliente → briefing → Bio Site → edição rápida → publicar → exclusão", async ({
  page,
}, testInfo) => {
  const slug = `e2e-${testInfo.project.name}`;

  // ID de uma imagem de OUTRO cliente (demo), para testar o isolamento.
  await page.goto("/demo-padaria");
  const demoSrc = await page.locator(".bio-gallery img").first().getAttribute("src");
  const [, foreignAssetId] = /\/media\/([^/]+)\//.exec(demoSrc!)!;

  // Cadastro
  await page.goto("/admin");
  await expectNoA11yViolations(page);
  await page.getByRole("link", { name: "Novo cliente" }).click();
  await page.getByLabel("Nome do cliente").fill("Doce Ação E2E");
  await page.getByLabel("Segmento").selectOption("food");
  await expect(page.getByLabel("Endereço do Bio Site")).toHaveValue("doce-acao-e2e");
  await page.getByLabel("Endereço do Bio Site").fill("admin");
  await page.getByRole("button", { name: "Criar cliente" }).click();
  await expect(page.getByText("este endereço é reservado")).toBeVisible();
  await page.getByLabel("Endereço do Bio Site").fill(slug);
  await page.getByRole("button", { name: "Criar cliente" }).click();
  await expect(page).toHaveURL(/\/admin\/clientes\/[0-9a-f-]{36}\/briefing$/);
  const clientId = /clientes\/([0-9a-f-]{36})/.exec(page.url())![1];

  // Briefing
  await page.getByLabel("Instagram").fill("@doceacao");
  await page.getByLabel("WhatsApp").fill("+55 11 98888-7777");
  await page.getByLabel("Categorias").fill("Bolos, Doces");
  await page.getByRole("button", { name: "Salvar briefing" }).click();
  await expect(page.getByText("Briefing salvo.")).toBeVisible();

  // Imagem própria (para o teste de isolamento depois)
  await page.getByRole("link", { name: "Imagens" }).click();
  const png = await sharp({
    create: { width: 800, height: 800, channels: 3, background: "#9a4f0e" },
  })
    .png()
    .toBuffer();
  await page
    .getByLabel("Arquivos")
    .setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: png });
  await page.getByRole("button", { name: "Enviar" }).click();
  await expect(page.getByText("logo.png enviada.")).toBeVisible();
  const assetId = (await page.getByText(/^id: /).textContent())!.replace("id: ", "").trim();

  // Criar Bio Site
  await page.getByRole("link", { name: "Bio Site", exact: true }).click();
  await page.getByLabel("Âmbar").check();
  await page.getByRole("button", { name: "Criar Bio Site" }).click();
  await expect(page.getByText("Ainda não publicado.")).toBeVisible();
  await expectNoA11yViolations(page);

  // Antes de publicar, o endereço público não existe
  expect((await page.request.get(`/${slug}`)).status()).toBe(404);

  // Edição rápida: troca Instagram, cria Wi-Fi, liga a faixa e publica
  await page.getByRole("link", { name: "Edição rápida" }).first().click();
  await expect(page.getByLabel("Instagram")).toHaveValue("doceacao");
  await expectNoA11yViolations(page);
  await page.getByLabel("Instagram").fill("https://www.instagram.com/doce.acao.oficial/");
  await page.getByLabel("Nome da rede").fill("DOCE-WIFI");
  await page.getByLabel("Senha").fill("bolo1234");
  await page.getByLabel("Mostrar a faixa").check();
  await page.getByLabel("Frases (uma por linha)").fill("Bolo do dia\nEncomendas abertas");
  await page.getByRole("button", { name: "Salvar e publicar" }).click();
  await expect(page.getByText("Salvo e publicado.")).toBeVisible();

  await page.goto(`/${slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Doce Ação E2E");
  await expect(page.getByRole("link", { name: /Instagram @doce\.acao\.oficial/ })).toHaveAttribute(
    "href",
    "https://instagram.com/doce.acao.oficial",
  );
  await expect(page.getByRole("region", { name: "Wi-Fi" })).toContainText("DOCE-WIFI");
  await expect(page.getByRole("region", { name: "Avisos" })).toContainText("Bolo do dia");
  await expectNoA11yViolations(page);

  // Cores da faixa sem contraste são recusadas; salvar rascunho não muda o publicado
  await page.goto(`/admin/clientes/${clientId}/rapida`);
  await page.getByLabel("Usar cores próprias").check();
  await page.getByLabel("Cor do fundo").fill("#ffffff");
  await page.getByLabel("Cor da letra").fill("#eeeeee");
  await page.getByRole("button", { name: "Salvar e publicar" }).click();
  await expect(page.getByText(/contraste da faixa/).first()).toBeVisible();
  await page.getByLabel("Usar cores próprias").uncheck();
  await page.getByLabel("Mostrar a faixa").uncheck();
  await page.getByRole("button", { name: "Salvar rascunho" }).click();
  await expect(page.getByText("Rascunho salvo.")).toBeVisible();
  await page.goto(`/${slug}`);
  await expect(page.getByRole("region", { name: "Avisos" })).toBeVisible();
  await page.goto(`/preview/${clientId}`);
  await expect(page.getByRole("region", { name: "Avisos" })).toHaveCount(0);

  // Publicar pela aba Bio Site
  await page.goto(`/admin/clientes/${clientId}/site`);
  await expect(page.getByText(/alterações no rascunho ainda não publicadas/)).toBeVisible();
  await page.getByRole("button", { name: "Publicar rascunho" }).click();
  await expect(page.getByText("Publicado.")).toBeVisible();
  await page.goto(`/${slug}`);
  await expect(page.getByRole("region", { name: "Avisos" })).toHaveCount(0);

  // Edição avançada: imagem de outro cliente e link inseguro são recusados; a própria é aceita
  await page.goto(`/admin/clientes/${clientId}/site`);
  await editJson(page, (doc) => {
    doc.profile.logo = { assetId: foreignAssetId, alt: "intrusa" };
  });
  await expect(page.getByText(/imagem não pertence a este cliente/)).toBeVisible();
  await page.reload();
  await editJson(page, (doc) => {
    doc.blocks.push({
      id: "x",
      type: "link",
      action: "url",
      title: "X",
      url: "javascript:alert(1)",
    });
  });
  await expect(page.getByText(/link inválido ou inseguro/)).toBeVisible();
  await page.reload();
  await editJson(page, (doc) => {
    doc.profile.logo = { assetId, alt: "Logo Doce Ação" };
  });
  await expect(page.getByText("Rascunho salvo.")).toBeVisible();
  await page.goto(`/preview/${clientId}`);
  await expect(page.getByRole("img", { name: "Logo Doce Ação" })).toBeVisible();

  // Imagem em uso não pode ser excluída
  await page.goto(`/admin/clientes/${clientId}/imagens`);
  await page.getByRole("button", { name: "Excluir imagem" }).click();
  await expect(page.getByText(/está em uso no site/)).toBeVisible();

  // Exclusão do cliente
  await page.goto(`/admin/clientes/${clientId}`);
  await page.getByLabel(/Para confirmar/).fill(slug);
  await page.getByRole("button", { name: "Excluir cliente definitivamente" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  expect((await page.request.get(`/${slug}`)).status()).toBe(404);
  expect((await page.request.get(`/media/${assetId}/480.webp`)).status()).toBe(404);
});

test("prévia e painel exigem sessão", async ({ browser }) => {
  // newContext herda o `use` do arquivo (inclusive a sessão salva); zera explicitamente.
  const anon = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await anon.newPage();
  await page.goto("/preview/00000000-0000-4000-8000-000000000000");
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/admin/clientes/novo");
  await expect(page).toHaveURL(/\/login$/);
  await anon.close();
});
