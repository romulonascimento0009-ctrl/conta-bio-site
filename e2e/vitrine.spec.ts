import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import sharp from "sharp";
import { AUTH_FILE } from "../playwright.config";

// Vitrine (D57, Ótica do Brasileiro): destaques em círculo com visualizador, ofertas, catálogo em
// grade com filtros e ficha do produto (ângulos, zoom, pedir pelo WhatsApp).
test.use({ storageState: AUTH_FILE });

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];

test("vitrine: destaques, filtros, ficha com ângulos e zoom", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "fluxo do painel: uma vez basta");
  test.slow();
  const slug = "otica-e2e";

  await page.goto("/admin");
  await page.getByRole("link", { name: "Novo cliente" }).click();
  await page.getByLabel("Nome do cliente").fill("Ótica E2E");
  await page.getByLabel("Segmento").selectOption("health");
  await page.getByLabel("Endereço do Bio Site").fill(slug);
  await page.getByRole("button", { name: "Criar cliente" }).click();
  await expect(page).toHaveURL(/\/admin\/clientes\/[0-9a-f-]{36}\/briefing$/);
  const clientId = /clientes\/([0-9a-f-]{36})/.exec(page.url())![1];
  await page.getByLabel("WhatsApp").fill("85 8576-3863");
  await page.getByRole("button", { name: "Salvar cadastro" }).click();
  await expect(page.getByText("Cadastro salvo.")).toBeVisible();

  await page.getByRole("link", { name: "Imagens" }).click();
  const names = ["frente.png", "diagonal.png", "story.png"];
  for (const [i, name] of names.entries()) {
    const png = await sharp({
      create: {
        width: 600,
        height: 600,
        channels: 3,
        background: ["#3b2a1e", "#7a4a22", "#062a66"][i],
      },
    })
      .png()
      .toBuffer();
    await page
      .getByLabel("Arquivos", { exact: true })
      .setInputFiles({ name, mimeType: "image/png", buffer: png });
    await page.getByRole("button", { name: "Enviar", exact: true }).click();
    await expect(page.getByText(`${name} enviada.`)).toBeVisible();
  }
  const [frente, diagonal, story] = await Promise.all(
    names.map(async (n) =>
      (await page.locator("li").filter({ hasText: n }).getByText(/^id: /).textContent())!
        .replace("id: ", "")
        .trim(),
    ),
  );

  await page.getByRole("link", { name: "Bio Site", exact: true }).click();
  await page.getByRole("button", { name: "Criar Bio Site" }).click();
  await expect(page.getByText("Ainda não publicado.")).toBeVisible();
  const textarea = page.getByLabel("Documento do Bio Site (JSON)");
  const doc = JSON.parse(await textarea.inputValue());
  doc.theme = {
    colors: {
      base: "#eef3fd",
      cardTop: "#0349b8",
      cardBottom: "#062a66",
      accent: "#062a66",
      ink: "#0e1b33",
      inkMuted: "#566176",
      logoBg: "#062a66",
      logoFg: "#ffffff",
      glow1: "#dce7fb",
      glow2: "#fff4cc",
      glow3: "#f3f6fd",
    },
    fonts: { display: "quicksand", body: "dm-sans" },
    radius: "soft",
    pattern: "none",
    chips: { bg: "#fccf04", fg: "#062a66" },
    layout: "shop",
  };
  const img = (assetId: string, title?: string) => ({
    assetId,
    alt: "",
    ...(title ? { title } : {}),
  });
  doc.blocks = [
    {
      id: "destaques",
      type: "stories",
      hidden: false,
      title: "Destaques",
      items: [
        {
          id: "promocoes",
          name: "Promoções",
          cover: img(story),
          slides: [
            {
              id: "q1",
              image: img(story),
              tag: "Só hoje",
              title: "Lentes grátis",
              button: "Quero esta oferta",
            },
            { id: "q2", image: img(story), title: "Exame de vista" },
          ],
        },
      ],
    },
    {
      id: "ofertas",
      type: "promos",
      hidden: false,
      items: [{ id: "semana", size: "large", tag: "Só esta semana", title: "Armação + lentes" }],
    },
    {
      id: "armacoes",
      type: "catalog",
      hidden: false,
      title: "Armações",
      mode: "shop",
      categories: [
        {
          id: "grau",
          name: "Grau",
          products: [
            {
              id: "redondo",
              name: "Clássico Redondo",
              priceCents: 18900,
              compareAtCents: 23900,
              tags: ["Unissex"],
              image: img(frente, "Frente"),
              media: [{ kind: "image", ...img(diagonal, "Diagonal") }],
            },
          ],
        },
        {
          id: "sol",
          name: "Sol",
          products: [{ id: "aviador", name: "Aviador", priceCents: 24900, image: img(diagonal) }],
        },
      ],
    },
    {
      id: "sobre",
      type: "text",
      hidden: false,
      title: "Sobre a Ótica",
      body: "Texto.",
      showAddress: false,
    },
  ];
  await textarea.fill(JSON.stringify(doc, null, 2));
  await page.getByRole("button", { name: "Validar e salvar" }).click();
  await expect(page.getByText("Rascunho salvo.")).toBeVisible();

  await page.goto(`/preview/${clientId}`);
  await expect(page.locator(".shop")).toBeVisible();
  await expect(page.locator(".bio-card")).toHaveCount(0);
  expect((await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()).violations).toEqual([]);

  // Destaques: abre em tela cheia, avança, o botão leva o título na mensagem e Esc fecha.
  await page.getByRole("button", { name: "Promoções" }).click();
  const viewer = page.getByRole("dialog", { name: "Promoções" });
  await expect(viewer.getByRole("heading", { name: "Lentes grátis" })).toBeVisible();
  const cta = viewer.getByRole("link", { name: "Quero esta oferta" });
  const ctaUrl = new URL((await cta.getAttribute("href"))!);
  expect(ctaUrl.origin + ctaUrl.pathname).toBe("https://wa.me/558585763863");
  expect(ctaUrl.searchParams.get("text")).toContain("Lentes grátis");
  expect((await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()).violations).toEqual([]);
  await viewer.getByRole("button", { name: "Próximo quadro" }).click();
  await expect(viewer.getByRole("heading", { name: "Exame de vista" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(viewer).toBeHidden();

  // Filtros: categorias e etiquetas.
  const grid = page.locator(".shop-grid");
  await expect(grid.getByRole("button")).toHaveCount(2);
  await page.getByRole("button", { name: "Sol", exact: true }).click();
  await expect(grid.getByRole("button")).toHaveCount(1);
  await page.getByRole("button", { name: "Unissex", exact: true }).click();
  await expect(grid.getByRole("button", { name: /Clássico Redondo/ })).toBeVisible();
  await expect(grid).toContainText("-21%");

  // Ficha: ângulos com nome, zoom ao tocar e pedido com modelo e preço.
  await grid.getByRole("button", { name: /Clássico Redondo/ }).click();
  const sheet = page.getByRole("dialog", { name: "Clássico Redondo" });
  await expect(sheet.getByRole("button", { name: "Frente", exact: true })).toHaveAttribute(
    "aria-current",
    "true",
  );
  await sheet.getByRole("button", { name: "Diagonal", exact: true }).click();
  await expect(sheet.getByRole("button", { name: "Diagonal", exact: true })).toHaveAttribute(
    "aria-current",
    "true",
  );
  const view = sheet.getByRole("button", { name: "Diagonal: toque para ampliar" });
  await view.click();
  await expect(sheet.locator(".shop-stage")).toHaveClass(/zoomed/);
  await expect(sheet.getByRole("button", { name: "Diagonal: toque para reduzir" })).toBeVisible();
  const order = new URL(
    (await sheet.getByRole("link", { name: "Pedir pelo WhatsApp" }).getAttribute("href"))!,
  );
  expect(order.searchParams.get("text")).toMatch(/Clássico Redondo \(R\$\s189,00\)/);
  expect((await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()).violations).toEqual([]);
  await sheet.getByRole("button", { name: "Fechar" }).click();
  await expect(sheet).toBeHidden();

  // Editor: blocos novos com os nomes certos e o tipo de página na Aparência.
  await page.goto(`/admin/clientes/${clientId}/editor`);
  await page.getByRole("button", { name: "Destaques", exact: true }).click();
  await expect(page.getByLabel("Quadro 1 — título (opcional)")).toHaveValue("Lentes grátis");
  await page.getByRole("button", { name: "Ofertas", exact: true }).click();
  await expect(page.getByLabel("Oferta 1 — título")).toHaveValue("Armação + lentes");

  await page.goto(`/admin/clientes/${clientId}`);
  await page.getByLabel(/Para confirmar/).fill(slug);
  await page.getByRole("button", { name: "Excluir cliente definitivamente" }).click();
  await expect(page).toHaveURL(/\/admin$/);
});
