import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Site de demonstração criado por scripts/seed-demo.ts (slug "demo"), servido em demo.localhost.
const demoUrl = (baseURL: string) => baseURL.replace("://localhost", "://demo.localhost");

test.describe("site público por subdomínio", () => {
  test("renderiza todas as seções, sem rolagem horizontal e com imagens carregadas", async ({
    page,
    baseURL,
  }) => {
    const res = await page.goto(demoUrl(baseURL!));
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Cabelo que conversa com quem você é",
    );
    for (const name of [
      "Sobre a Ana",
      "Serviços e preços",
      "Trabalhos recentes",
      "Quem já passou por aqui",
      "Onde estamos",
    ]) {
      await expect(page.getByRole("heading", { name, level: 2 })).toBeVisible();
    }
    await expect(page.getByText("R$ 120")).toBeVisible();
    await expect(page.getByText("a partir de R$ 180")).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    // Rola até o fim para carregar as imagens preguiçosas e confere que todas abriram.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForLoadState("networkidle");
    const broken = await page.$$eval("img", (imgs) =>
      imgs.filter((i) => !(i.complete && i.naturalWidth > 0)).map((i) => i.src),
    );
    expect(broken).toEqual([]);
  });

  test("botão Agendar leva ao WhatsApp em nova aba", async ({ page, baseURL }) => {
    await page.goto(demoUrl(baseURL!));
    const cta = page.getByRole("link", { name: "Agendar horário" }).first();
    await expect(cta).toHaveAttribute("href", /^https:\/\/wa\.me\/5511999998888\?text=/);
    await expect(cta).toHaveAttribute("target", "_blank");
    await expect(cta).toHaveAttribute("rel", /noopener/);
  });

  test("sem violações de acessibilidade (WCAG 2.2 AA)", async ({ page, baseURL }) => {
    await page.goto(demoUrl(baseURL!));
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("metadados de SEO e indexação", async ({ page, baseURL }) => {
    await page.goto(demoUrl(baseURL!));
    await expect(page).toHaveTitle("Studio Demo — cabelo e coloração");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /index, follow/);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      /\/media\/.+\.webp$/,
    );
    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
  });

  test("subdomínio inexistente responde 404", async ({ page, baseURL }) => {
    const res = await page.goto(baseURL!.replace("://localhost", "://nao-existe.localhost"));
    expect(res?.status()).toBe(404);
  });

  test("rota interna /s/ não é acessível pelo domínio do painel", async ({ request }) => {
    const res = await request.get("/s/demo");
    expect(res.status()).toBe(404);
  });

  test("mídia: variante inexistente e id inválido respondem 404", async ({
    request,
    page,
    baseURL,
  }) => {
    await page.goto(demoUrl(baseURL!));
    const src = await page.locator("main img").first().getAttribute("src");
    const [, assetId] = /\/media\/([^/]+)\//.exec(src!)!;
    expect((await request.get(`/media/${assetId}/480.webp`)).status()).toBe(200);
    expect((await request.get(`/media/${assetId}/123.webp`)).status()).toBe(404);
    expect((await request.get(`/media/nao-e-uuid/480.webp`)).status()).toBe(404);
    expect((await request.get(`/media/${assetId}/480.png`)).status()).toBe(404);
  });
});
