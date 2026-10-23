import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Bio Sites de demonstração criados por scripts/seed-demo.ts.
const PADARIA = "/demo-padaria";

test.describe("Bio Site público", () => {
  test("mostra topo, faixa e cartões na ordem certa", async ({ page }) => {
    const res = await page.goto(PADARIA);
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Forno da Serra");
    await expect(page.getByRole("list", { name: "Categorias" })).toContainText("PÃES");
    await expect(page.getByText("Campinas/SP", { exact: true })).toBeVisible();

    const cards = page.locator(".bio-card strong");
    await expect(cards.first()).toHaveText("Instagram");
    await expect(cards.nth(1)).toHaveText("Avaliar no Google");
    await expect(cards.last()).toHaveText("Como chegar");
    // Visual padrão (D41): cartões iguais, sem destaque; Google sem nota; fachada no alto
    const google = page.locator('a[data-block-id="google"]');
    await expect(google).toHaveClass(/\bstd\b/);
    await expect(google).toContainText("Sua opinião ajuda");
    await expect(google.locator(".bio-value")).toHaveCount(0);
    await expect(page.locator(".bio-featured, .bio-card.featured")).toHaveCount(0);
    await expect(page.getByRole("img", { name: "Fachada da Forno da Serra" })).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("links dos cartões levam ao serviço certo, em nova aba", async ({ page }) => {
    await page.goto(PADARIA);
    const ig = page.getByRole("link", { name: "Instagram Siga no Instagram" });
    await expect(ig).toHaveAttribute("href", "https://instagram.com/fornodaserra");
    await expect(ig).toHaveAttribute("target", "_blank");
    await expect(ig).toHaveAttribute("rel", /noopener/);
    await expect(page.getByRole("link", { name: /Avaliar no Google/ }).first()).toHaveAttribute(
      "href",
      "https://g.page/r/demo-forno/review",
    );
    await expect(page.getByRole("link", { name: /Fazer pedido no WhatsApp/ })).toHaveAttribute(
      "href",
      /^https:\/\/wa\.me\/5519999998888/,
    );
    await expect(page.getByRole("link", { name: "Conversar no WhatsApp" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Como chegar/ })).toHaveAttribute(
      "href",
      /^https:\/\/www\.google\.com\/maps\/search\//,
    );
  });

  test("Wi-Fi: cartão mostra só a rede; a senha aparece ao tocar, sem QR code", async ({
    page,
    context,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", "permissão de área de transferência só no Chromium");
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto(PADARIA);
    const card = page.locator('button[data-block-id="wifi"]');
    await expect(card).toContainText("FORNO-CLIENTES");
    await expect(page.getByText("paoquentinho")).toBeHidden();
    await card.click();
    const sheet = page.getByRole("dialog", { name: "Wi-Fi" });
    await expect(sheet).toContainText("paoquentinho");
    await sheet.getByRole("button", { name: "Copiar senha" }).click();
    await expect(sheet.getByRole("button", { name: "Senha copiada" })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("paoquentinho");
    await expect(page.getByText("Conectar com QR code")).toHaveCount(0);
  });

  test("faixa de aviso acessível para leitores de tela", async ({ page }) => {
    await page.goto(PADARIA);
    const avisos = page.getByRole("region", { name: "Avisos" });
    await expect(avisos.getByRole("listitem")).toHaveText([
      "Fornada das 6h",
      "Encomendas para festas",
      "Café coado na hora",
    ]);
  });

  test("todas as imagens carregam", async ({ page }) => {
    await page.goto(PADARIA);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForLoadState("networkidle");
    // Fotos dentro de um painel fechado ("Meus trabalhos") só carregam ao abrir.
    const broken = await page.$$eval("img", (imgs) =>
      imgs
        .filter((i) => !i.closest("dialog:not([open])"))
        .filter((i) => !(i.complete && i.naturalWidth > 0))
        .map((i) => i.src),
    );
    expect(broken).toEqual([]);
  });

  test("galeria em cartão abre as fotos com legenda e fecha", async ({ page }) => {
    await page.goto(PADARIA);
    await page.getByRole("button", { name: /Saindo do forno/ }).click();
    const sheet = page.getByRole("dialog", { name: "Saindo do forno" });
    await expect(sheet).toBeVisible();
    await expect(sheet.locator("figcaption").first()).toContainText("Saindo do forno — 1");
    await expect(sheet.locator("img").first()).toHaveJSProperty("complete", true);
    await sheet.getByRole("button", { name: "Fechar" }).click();
    await expect(sheet).toBeHidden();
  });

  for (const slug of ["/demo-padaria", "/demo-salao", "/demo-clinica"]) {
    test(`sem violações de acessibilidade (WCAG 2.2 AA): ${slug}`, async ({ page }) => {
      await page.goto(slug);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  }

  test("metadados de SEO e indexação", async ({ page }) => {
    await page.goto(PADARIA);
    await expect(page).toHaveTitle("Forno da Serra");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /index, follow/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/demo-padaria$/);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      /\/media\/.+\.webp$/,
    );
  });

  test("endereço inexistente ou com maiúsculas responde 404", async ({ page }) => {
    expect((await page.goto("/nao-existe"))?.status()).toBe(404);
    expect((await page.goto("/Demo-Padaria"))?.status()).toBe(404);
  });

  test("mídia: variante inexistente e id inválido respondem 404", async ({ request, page }) => {
    await page.goto(PADARIA);
    const src = await page.locator(".bio-shot img").first().getAttribute("src");
    const [, assetId] = /\/media\/([^/]+)\//.exec(src!)!;
    expect((await request.get(`/media/${assetId}/480.webp`)).status()).toBe(200);
    expect((await request.get(`/media/${assetId}/123.webp`)).status()).toBe(404);
    expect((await request.get(`/media/nao-e-uuid/480.webp`)).status()).toBe(404);
  });
});
