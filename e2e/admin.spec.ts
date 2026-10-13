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
type DraftDoc = {
  contact: Record<string, unknown>;
  sections: { props: Record<string, unknown> }[];
};

async function editDraft(page: Page, mutate: (doc: DraftDoc) => void) {
  const textarea = page.getByLabel("Documento do site (JSON)");
  const doc = JSON.parse(await textarea.inputValue());
  mutate(doc);
  await textarea.fill(JSON.stringify(doc, null, 2));
  await page.getByRole("button", { name: "Validar e salvar" }).click();
}

test("fluxo completo: cliente → briefing → imagem → site → prévia → exclusão", async ({
  page,
  baseURL,
}, testInfo) => {
  const slug = `e2e-${testInfo.project.name}`;

  // ID de uma imagem de OUTRO cliente (demo), para testar o isolamento.
  await page.goto(baseURL!.replace("://localhost", "://demo.localhost"));
  const demoSrc = await page.locator("main img").first().getAttribute("src");
  const [, foreignAssetId] = /\/media\/([^/]+)\//.exec(demoSrc!)!;

  // Lista e cadastro
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Clientes" })).toBeVisible();
  await expectNoA11yViolations(page);
  await page.getByRole("link", { name: "Novo cliente" }).click();
  await expectNoA11yViolations(page);
  await page.getByLabel("Nome do cliente").fill("Ação Beleza E2E");
  await expect(page.getByLabel("Endereço do site")).toHaveValue("acao-beleza-e2e");
  await page.getByLabel("Endereço do site").fill("admin");
  await page.getByRole("button", { name: "Criar cliente" }).click();
  await expect(page.getByText("este endereço é reservado")).toBeVisible();
  await expect(page.getByLabel("Nome do cliente")).toHaveValue("Ação Beleza E2E");
  await page.getByLabel("Endereço do site").fill(slug);
  await page.getByRole("button", { name: "Criar cliente" }).click();
  await expect(page).toHaveURL(/\/admin\/clientes\/[0-9a-f-]{36}\/briefing$/);
  const clientId = /clientes\/([0-9a-f-]{36})/.exec(page.url())![1];

  // Briefing: erro preserva o que foi digitado; depois salva
  await page.getByLabel("WhatsApp").fill("123");
  await page.getByLabel("Cidade").fill("Recife");
  await page.getByRole("button", { name: "Salvar briefing" }).click();
  await expect(page.getByText("WhatsApp com DDI e DDD")).toBeVisible();
  await expect(page.getByLabel("Cidade")).toHaveValue("Recife");
  await page.getByLabel("WhatsApp").fill("+55 81 98888-7777");
  await page.getByRole("button", { name: "Salvar briefing" }).click();
  await expect(page.getByText("Briefing salvo.")).toBeVisible();
  await expectNoA11yViolations(page);

  // Imagem: arquivo falso é recusado; imagem real é aceita
  await page.getByRole("link", { name: "Imagens" }).click();
  await page.getByLabel("Arquivos").setInputFiles({
    name: "falsa.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from("isto não é uma imagem"),
  });
  await page.getByRole("button", { name: "Enviar" }).click();
  await expect(page.getByText("falsa.jpg: Arquivo não é uma imagem válida.")).toBeVisible();
  const png = await sharp({
    create: { width: 1200, height: 900, channels: 3, background: "#c2185b" },
  })
    .png()
    .toBuffer();
  await page
    .getByLabel("Arquivos")
    .setInputFiles({ name: "foto.png", mimeType: "image/png", buffer: png });
  await page.getByRole("button", { name: "Enviar" }).click();
  await expect(page.getByText("foto.png enviada.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Imagens enviadas (1)" })).toBeVisible();
  const assetId = (await page.getByText(/^id: /).textContent())!.replace("id: ", "").trim();
  await expectNoA11yViolations(page);

  // Site: cria a partir de um tema
  await page.getByRole("link", { name: "Site" }).click();
  await page.getByLabel("Verde Calmo").check();
  await page.getByRole("button", { name: "Criar site" }).click();
  await expect(page.getByLabel("Documento do site (JSON)")).toBeVisible();
  await expectNoA11yViolations(page);

  // Rascunho: JSON quebrado, imagem de outro cliente e link inseguro são recusados
  await page.getByLabel("Documento do site (JSON)").fill("{");
  await page.getByRole("button", { name: "Validar e salvar" }).click();
  await expect(page.getByText(/JSON inválido/)).toBeVisible();
  await page.reload();
  await editDraft(page, (doc) => {
    doc.sections[0].props.image = { assetId: foreignAssetId, alt: "intrusa" };
  });
  await expect(page.getByText(/imagem não pertence a este cliente/)).toBeVisible();
  await page.reload();
  await editDraft(page, (doc) => {
    doc.contact.bookingUrl = "javascript:alert(1)";
  });
  await expect(page.getByText(/link inválido ou inseguro/)).toBeVisible();

  // Rascunho válido com a imagem do próprio cliente
  await page.reload();
  await editDraft(page, (doc) => {
    doc.sections[0].props.heading = "Beleza com calma no Recife";
    doc.sections[0].props.image = { assetId, alt: "Foto do estúdio" };
  });
  await expect(page.getByText("Rascunho salvo.")).toBeVisible();

  // Prévia do rascunho
  await page.goto(`/preview/${clientId}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Beleza com calma no Recife");
  await expect(page.getByRole("img", { name: "Foto do estúdio" })).toBeVisible();
  await expectNoA11yViolations(page);

  // Não publicado: o subdomínio ainda não existe publicamente
  const pub = await page.goto(baseURL!.replace("://localhost", `://${slug}.localhost`));
  expect(pub?.status()).toBe(404);

  // Imagem em uso não pode ser excluída
  await page.goto(`/admin/clientes/${clientId}/imagens`);
  await page.getByRole("button", { name: "Excluir imagem" }).click();
  await expect(page.getByText(/está em uso no site/)).toBeVisible();

  // Exclusão do cliente exige confirmação
  await page.goto(`/admin/clientes/${clientId}`);
  await page.getByLabel(/Para confirmar/).fill("errado");
  await page.getByRole("button", { name: "Excluir cliente definitivamente" }).click();
  await expect(page.getByText(`Digite exatamente "${slug}"`)).toBeVisible();
  await page.getByLabel(/Para confirmar/).fill(slug);
  await page.getByRole("button", { name: "Excluir cliente definitivamente" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("link", { name: "Ação Beleza E2E" })).toHaveCount(0);
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
