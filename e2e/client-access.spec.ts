import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type Page, type TestInfo } from "@playwright/test";
import { AUTH_FILE } from "../playwright.config";
import { EXPIRED_INVITE_TOKEN } from "./fixtures";

test.use({ storageState: AUTH_FILE });

async function expectNoA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
}

/** Navegador anônimo com o mesmo aparelho do projeto (desktop ou celular). */
async function anonymousPage(browser: Browser, testInfo: TestInfo, baseURL: string) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { defaultBrowserType, ...device } = testInfo.project.use as Record<string, unknown>;
  const context = await browser.newContext({
    ...device,
    baseURL,
    storageState: { cookies: [], origins: [] },
  });
  return context.newPage();
}

async function createInvite(page: Page, clientId: string, email: string): Promise<string> {
  await page.goto(`/admin/clientes/${clientId}/acessos`);
  await page.getByLabel("E-mail de quem vai acessar").fill(email);
  await page.getByRole("button", { name: "Criar convite" }).click();
  const link = page.getByLabel("Link do convite");
  await expect(link).toHaveValue(/\/convite\//);
  return new URL(await link.inputValue()).pathname;
}

test("convite → cliente edita e publica só o próprio Bio Site; isolamento e auditoria", async ({
  page,
  browser,
  baseURL,
}, testInfo) => {
  // Fluxo longo no `next dev`: com a máquina ocupada passa dos 30 s padrão.
  test.slow();
  const project = testInfo.project.name;
  const slug = `acesso-${project}`;
  const email = `cliente-${project}@teste.local`;

  // Outro cliente (demo do salão), para provar o isolamento
  await page.goto("/admin");
  const salaoHref = await page
    .getByRole("row")
    .filter({ hasText: "demo-salao" })
    .getByRole("link")
    .getAttribute("href");
  const salaoId = /clientes\/([0-9a-f-]{36})/.exec(salaoHref!)![1];

  // Operador: cliente com Bio Site publicado
  await page.goto("/admin/clientes/novo");
  await page.getByLabel("Nome do cliente").fill("Ateliê Convidado");
  await page.getByLabel("Segmento").selectOption("beauty");
  await page.getByLabel("Endereço do Bio Site").fill(slug);
  await page.getByRole("button", { name: "Criar cliente" }).click();
  await expect(page).toHaveURL(/\/briefing$/);
  const clientId = /clientes\/([0-9a-f-]{36})/.exec(page.url())![1];
  await page.goto(`/admin/clientes/${clientId}/site`);
  await page.getByRole("button", { name: "Criar Bio Site" }).click();
  await page.getByLabel("Revisei a prévia e aprovo a publicação").check();
  await page.getByRole("button", { name: "Publicar", exact: true }).click();
  await expect(page.getByText("Publicado.")).toBeVisible();

  // Operador: convite (e-mail já em uso é recusado)
  await page.goto(`/admin/clientes/${clientId}/acessos`);
  await page.getByLabel("E-mail de quem vai acessar").fill("operador@teste.local");
  await page.getByRole("button", { name: "Criar convite" }).click();
  await expect(page.getByText("Já existe uma conta com este e-mail.")).toBeVisible();
  const invitePath = await createInvite(page, clientId, email);
  await expectNoA11yViolations(page);

  // Cliente: aceita o convite
  const client = await anonymousPage(browser, testInfo, baseURL!);
  await client.goto(invitePath);
  await expect(client.getByRole("heading", { level: 1 })).toHaveText(
    "Bio Site de Ateliê Convidado",
  );
  await expect(client.getByLabel("E-mail")).toHaveValue(email);
  await expectNoA11yViolations(client);
  await client.getByLabel("Seu nome").fill("Rita");
  await client.getByLabel("Crie uma senha").fill("senha-da-rita-123");
  await client.getByLabel("Repita a senha").fill("outra-senha-123");
  await client.getByRole("button", { name: "Criar acesso" }).click();
  await expect(client.getByText("as senhas não conferem")).toBeVisible();
  await client.getByLabel("Crie uma senha").fill("senha-da-rita-123");
  await client.getByLabel("Repita a senha").fill("senha-da-rita-123");
  await client.getByRole("button", { name: "Criar acesso" }).click();
  await expect(client).toHaveURL(/\/painel$/);
  await expect(client.getByRole("banner")).toContainText("Ateliê Convidado");

  // Convite é de uso único; expirado é recusado
  const other = await anonymousPage(browser, testInfo, baseURL!);
  await other.goto(invitePath);
  await expect(other.getByRole("alert").filter({ hasText: "já foi usado" })).toBeVisible();
  await other.goto(`/convite/${EXPIRED_INVITE_TOKEN}`);
  await expect(other.getByRole("alert").filter({ hasText: "expirou" })).toBeVisible();
  await expectNoA11yViolations(other);
  await other.goto("/convite/token-que-nao-existe-0123456789");
  await expect(other.getByRole("alert").filter({ hasText: "não encontrado" })).toBeVisible();

  // Isolamento: o cliente não entra no painel do operador nem em dados de outro cliente
  await client.goto("/admin");
  await expect(client).toHaveURL(/\/painel$/);
  await client.goto(`/admin/clientes/${salaoId}/editor`);
  await expect(client).toHaveURL(/\/painel$/);
  await client.goto(`/admin/clientes/${salaoId}/imagens`);
  await expect(client).toHaveURL(/\/painel$/);
  expect((await client.goto(`/preview/${salaoId}`))!.status()).toBe(404);
  expect((await client.goto(`/preview/${clientId}`))!.status()).toBe(200);
  await client.goto("/painel/imagens");
  await expect(client.getByRole("heading", { name: "Imagens enviadas (0)" })).toBeVisible();
  await expectNoA11yViolations(client);
  await client.goto("/painel/versoes");
  await expect(client.getByRole("button", { name: "Restaurar no rascunho" })).toHaveCount(1);

  // Isolamento no servidor: trocar o clientId enviado pelo navegador não grava em outro cliente
  await client.goto("/painel");
  // A IA é só do operador (gasto controlado pela plataforma)
  await expect(client.getByRole("tab", { name: "IA", exact: true })).toHaveCount(0);
  await client.getByRole("tab", { name: "Topo" }).click();
  await client.getByLabel("Nome", { exact: true }).fill("Invasão");
  await client.route("**/painel", async (route) => {
    const body = route.request().postData();
    if (route.request().method() !== "POST" || !body?.includes(clientId)) return route.continue();
    await route.continue({ postData: body.replaceAll(clientId, salaoId) });
  });
  await client.getByRole("button", { name: "Salvar rascunho" }).click();
  await expect(client.getByRole("status").filter({ hasText: "Não salvo" })).toBeVisible();
  await client.unroute("**/painel");
  await page.goto(`/preview/${salaoId}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Studio Lia Andrade");

  // Cliente edita e publica direto (sem aprovação do operador)
  await client.getByLabel("Nome", { exact: true }).fill("Ateliê da Rita");
  await client.getByRole("button", { name: "Salvar rascunho" }).click();
  await expect(client.getByRole("button", { name: "Rascunho salvo" })).toBeVisible();
  await expectNoA11yViolations(client);
  await client.getByLabel("Revisei a prévia e aprovo a publicação").check();
  await client.getByLabel("Nota da versão (opcional)").fill("Nome novo pela Rita");
  await client.getByRole("button", { name: "Publicar", exact: true }).click();
  await expect(client.getByText("Publicado.")).toBeVisible();
  await client.goto(`/${slug}`);
  await expect(client.getByRole("heading", { level: 1 })).toHaveText("Ateliê da Rita");

  // Operador: auditoria mostra quem fez o quê
  await page.goto(`/admin/clientes/${clientId}/atividade`);
  const rows = page.getByRole("row").filter({ hasText: email });
  await expect(rows.filter({ hasText: "Convite aceito" })).toHaveCount(1);
  await expect(rows.filter({ hasText: "Rascunho salvo" })).toContainText("Topo");
  await expect(rows.filter({ hasText: "Publicado" })).toContainText("Nome novo pela Rita");
  await expectNoA11yViolations(page);

  // Operador: convite cancelado é recusado
  const revokedPath = await createInvite(page, clientId, `segundo-${project}@teste.local`);
  await page.reload();
  await page
    .getByRole("button", { name: `Cancelar convite de segundo-${project}@teste.local` })
    .click();
  await expect(
    page.getByRole("row").filter({ hasText: `segundo-${project}@teste.local` }),
  ).toContainText("Cancelado");
  await other.goto(revokedPath);
  await expect(other.getByRole("alert").filter({ hasText: "cancelado" })).toBeVisible();

  // Operador: remover o acesso derruba a sessão do cliente
  await page.reload();
  await page.getByLabel(`Confirmo remover o acesso de ${email}`).check();
  await page.getByRole("button", { name: "Remover acesso" }).click();
  await expect(page.getByRole("heading", { name: "Pessoas com acesso (0)" })).toBeVisible();
  await client.goto("/painel");
  await expect(client).toHaveURL(/\/login$/);

  // Limpeza
  await client.context().close();
  await other.context().close();
  await page.goto(`/admin/clientes/${clientId}`);
  await page.getByLabel(/Para confirmar/).fill(slug);
  await page.getByRole("button", { name: "Excluir cliente definitivamente" }).click();
  await expect(page).toHaveURL(/\/admin$/);
});
