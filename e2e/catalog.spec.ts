import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Catálogo com carrinho (D48) no demo do salão (scripts/seed-demo.ts).
const SALAO = "/demo-salao";
// O real formatado usa espaço não separável ("R$\u00a099,80"); compara com espaço comum.
const plain = (s: string) => s.replace(/\u00a0/g, " ");

test.describe("Catálogo com carrinho", () => {
  test("escolhe em duas categorias, ajusta quantidade e envia o pedido pelo WhatsApp", async ({
    page,
  }) => {
    await page.goto(SALAO);
    const shop = page.getByRole("region", { name: "Nossos produtos" });
    await expect(shop.getByRole("button", { name: /Cachos/ })).toContainText("Ver produtos (2)");
    await expect(page.getByRole("button", { name: /Seu pedido/ })).toHaveCount(0);

    await shop.getByRole("button", { name: /Cachos/ }).click();
    const cachos = page.getByRole("dialog", { name: "Cachos" });
    await expect(cachos).toBeVisible();
    await expect(cachos).toContainText("R$ 49,90");
    await cachos
      .getByRole("listitem")
      .filter({ hasText: "Creme de pentear" })
      .getByRole("button", { name: "Adicionar" })
      .click();
    await cachos
      .getByRole("group", { name: "Quantidade de Creme de pentear" })
      .getByRole("button", { name: "Mais um" })
      .click();
    await expect(
      cachos.getByRole("group", { name: "Quantidade de Creme de pentear" }),
    ).toContainText("2");
    await expect(cachos.getByRole("button", { name: /Seu pedido/ })).toContainText("R$ 99,80");
    await cachos.getByRole("button", { name: "Fechar" }).click();

    await shop.getByRole("button", { name: /Coloração/ }).click();
    const cor = page.getByRole("dialog", { name: "Coloração" });
    await expect(cor).toContainText("Preço no WhatsApp");
    await cor.getByRole("button", { name: "Adicionar" }).click();
    await cor.getByRole("button", { name: "Fechar" }).click();

    // Contagem por categoria e barra do pedido no lugar do botão flutuante do WhatsApp.
    await expect(shop.getByRole("button", { name: /Cachos/ })).toContainText("2");
    const bar = page.getByRole("button", { name: /Seu pedido/ });
    await expect(bar).toContainText("3");
    await expect(bar).toContainText("Valores confirmados no WhatsApp");
    await expect(page.getByRole("link", { name: "Conversar no WhatsApp" })).toBeHidden();

    await bar.click();
    const pedido = page.getByRole("dialog", { name: "Seu pedido" });
    await expect(pedido).toContainText("Creme de pentear");
    await expect(pedido).toContainText("Tonalizante");
    await expect(pedido).toContainText("a confirmar");
    const send = pedido.getByRole("link", { name: /Enviar pedido pelo WhatsApp/ });
    const href = (await send.getAttribute("href")) ?? "";
    expect(href.startsWith("https://wa.me/5581988887777?text=")).toBe(true);
    const msg = plain(decodeURIComponent(href.split("text=")[1]));
    expect(msg).toContain("Oi! Vim pelo Bio Site da Studio Lia Andrade e quero fazer este pedido:");
    expect(msg).toContain("• 2x Creme de pentear (Cachos) — R$ 99,80");
    expect(msg).toContain("• 1x Tonalizante (Coloração)");
    expect(msg).toContain("Pode me passar os valores?");
    await expect(send).toHaveAttribute("target", "_blank");

    const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(axe.violations).toEqual([]);

    // Tirar o item sem preço: total passa a ser calculado.
    await pedido
      .getByRole("group", { name: "Quantidade de Tonalizante" })
      .getByRole("button", { name: "Tirar um" })
      .click();
    await expect(pedido).not.toContainText("Tonalizante");
    await expect(pedido).toContainText("R$ 99,80");
    const msg2 = plain(
      decodeURIComponent(((await send.getAttribute("href")) ?? "").split("text=")[1]),
    );
    expect(msg2).toContain("Total: R$ 99,80");
    await pedido.getByRole("button", { name: "Fechar" }).click();

    // O pedido fica guardado neste navegador.
    await page.reload();
    await expect(page.getByRole("button", { name: /Seu pedido/ })).toContainText("2");
  });

  test("vitrine sem violações de acessibilidade e sem rolagem lateral", async ({ page }) => {
    await page.goto(SALAO);
    await expect(page.getByRole("region", { name: "Nossos produtos" })).toBeVisible();
    const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(axe.violations).toEqual([]);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
