import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";
import { AUTH_FILE } from "../playwright.config";

// Barbearia com agendamento pelo grupo (Reistyle, D50–D53): vídeo enviado em partes pelo painel,
// serviços com fotos e vídeos e botão Agendar, "Meu time" e efeito de placas.
test.use({ storageState: AUTH_FILE });

const GROUP = "https://chat.whatsapp.com/Ly7Tgg5RxiO5ctJYtDzrLg";

/** Vídeo WebM curto gravado pelo próprio navegador de teste (o Chromium de teste não abre H.264). */
async function recordWebm(page: Page): Promise<Buffer> {
  const b64 = await page.evaluate(async () => {
    const c = document.createElement("canvas");
    c.width = 320;
    c.height = 568;
    const x = c.getContext("2d")!;
    const rec = new MediaRecorder(c.captureStream(25), { mimeType: "video/webm" });
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => chunks.push(e.data);
    rec.start(200);
    const t0 = performance.now();
    await new Promise<void>((done) => {
      const f = () => {
        const t = performance.now() - t0;
        x.fillStyle = `hsl(${(t / 10) % 360} 60% 40%)`;
        x.fillRect(0, 0, 320, 568);
        if (t < 1500) requestAnimationFrame(f);
        else done();
      };
      f();
    });
    rec.stop();
    await new Promise((r) => (rec.onstop = r));
    const buf = new Uint8Array(await new Blob(chunks).arrayBuffer());
    let s = "";
    for (let i = 0; i < buf.length; i += 0x8000)
      s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    return btoa(s);
  });
  return Buffer.from(b64, "base64");
}

test("vídeo em partes, serviços com Agendar no grupo e Meu time", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "fluxo do painel: uma vez basta");
  test.slow();
  const slug = "barbearia-e2e";

  await page.goto("/admin");
  await page.getByRole("link", { name: "Novo cliente" }).click();
  await page.getByLabel("Nome do cliente").fill("Barbearia E2E");
  await page.getByLabel("Segmento").selectOption("beauty");
  await page.getByLabel("Endereço do Bio Site").fill(slug);
  await page.getByRole("button", { name: "Criar cliente" }).click();
  await expect(page).toHaveURL(/\/admin\/clientes\/[0-9a-f-]{36}\/briefing$/);
  const clientId = /clientes\/([0-9a-f-]{36})/.exec(page.url())![1];
  await page.getByLabel("Instagram").fill("@barbeariae2e");
  await page.getByRole("button", { name: "Salvar cadastro" }).click();
  await expect(page.getByText("Cadastro salvo.")).toBeVisible();

  // Fotos e vídeo.
  await page.getByRole("link", { name: "Imagens" }).click();
  for (const [name, color] of [
    ["corte.png", "#3a2a10"],
    ["barbeiro.png", "#6b4630"],
  ]) {
    const png = await sharp({ create: { width: 600, height: 800, channels: 3, background: color } })
      .png()
      .toBuffer();
    await page
      .getByLabel("Arquivos", { exact: true })
      .setInputFiles({ name, mimeType: "image/png", buffer: png });
    await page.getByRole("button", { name: "Enviar", exact: true }).click();
    await expect(page.getByText(`${name} enviada.`)).toBeVisible();
  }
  const [corteId, barbeiroId] = await Promise.all(
    ["corte.png", "barbeiro.png"].map(async (n) =>
      (await page.locator("li").filter({ hasText: n }).getByText(/^id: /).textContent())!
        .replace("id: ", "")
        .trim(),
    ),
  );

  // Arquivo que não é vídeo: recusado ainda no navegador, nada é enviado.
  await page.getByLabel("Selecionar vídeos").setInputFiles({
    name: "falso.mp4",
    mimeType: "video/mp4",
    buffer: Buffer.from("não é vídeo"),
  });
  await page.getByRole("button", { name: "Carregar vídeos" }).click();
  await expect(page.getByText(/falso\.mp4: este vídeo não abre no navegador/)).toBeVisible();

  const webm = await recordWebm(page);
  await page
    .getByLabel("Selecionar vídeos")
    .setInputFiles({ name: "degrade.webm", mimeType: "video/webm", buffer: webm });
  await page.getByRole("button", { name: "Carregar vídeos" }).click();
  await expect(page.getByText("degrade.webm enviado.")).toBeVisible();
  const videoCard = page.locator("li").filter({ hasText: "degrade.webm" });
  const videoId = (await videoCard.getByText(/^id: /).textContent())!.replace("id: ", "").trim();
  // A capa tirada do vídeo virou uma imagem do cliente.
  await expect(page.getByText(/Capa do vídeo|capa\.jpg/).first()).toBeAttached();

  // O vídeo é servido aos pedaços (Range), como o navegador pede.
  const head = await page.request.get(`/media/${videoId}/video.webm`, {
    headers: { range: "bytes=0-99" },
  });
  expect(head.status()).toBe(206);
  expect(head.headers()["content-range"]).toBe(`bytes 0-99/${webm.byteLength}`);
  expect([...(await head.body()).subarray(0, 4)]).toEqual([0x1a, 0x45, 0xdf, 0xa3]);
  expect(
    (
      await page.request.get(`/media/${videoId}/video.webm`, {
        headers: { range: "bytes=999999999-" },
      })
    ).status(),
  ).toBe(416);

  // Bio Site com o catálogo no modo Agendar, equipe e placas (pelo editor de JSON).
  await page.getByRole("link", { name: "Bio Site", exact: true }).click();
  await page.getByRole("button", { name: "Criar Bio Site" }).click();
  await expect(page.getByText("Ainda não publicado.")).toBeVisible();
  const textarea = page.getByLabel("Documento do Bio Site (JSON)");
  const doc = JSON.parse(await textarea.inputValue());
  doc.contact.whatsappGroup = GROUP;
  doc.theme.effects = "slabs";
  doc.blocks.unshift(
    {
      id: "servicos",
      type: "catalog",
      hidden: false,
      title: "Serviços e preços",
      mode: "book",
      categories: [
        {
          id: "c1",
          name: "Cortes",
          products: [
            {
              id: "p1",
              name: "Degradê",
              priceCents: 4000,
              image: { assetId: corteId, alt: "Degradê" },
              media: [{ kind: "video", videoId, caption: "Na máquina" }],
            },
          ],
        },
      ],
    },
    {
      id: "equipe",
      type: "team",
      hidden: false,
      title: "Meu time",
      members: [
        {
          id: "m1",
          name: "Rei",
          role: "Fundador",
          bio: "Degradê e barba.",
          skills: ["Degradê"],
          photo: { assetId: barbeiroId, alt: "Rei sorrindo" },
        },
        { id: "m2", name: "Davi", role: "Barbeiro", photo: { assetId: corteId, alt: "" } },
      ],
    },
  );
  await textarea.fill(JSON.stringify(doc, null, 2));
  await page.getByRole("button", { name: "Validar e salvar" }).click();
  await expect(page.getByText("Rascunho salvo.")).toBeVisible();

  // Prévia: serviço com vídeo, Agendar no grupo, Meu time.
  await page.goto(`/preview/${clientId}`);
  await expect(page.locator(".bio--fx-slabs .bio-slabs")).toBeAttached();
  const shop = page.getByRole("region", { name: "Serviços e preços" });
  await expect(shop.getByRole("button", { name: /Cortes/ })).toContainText("Ver serviços (1)");
  await shop.getByRole("button", { name: /Cortes/ }).click();
  const cortes = page.getByRole("dialog", { name: "Cortes" });
  await expect(cortes.getByRole("link", { name: "Agendar" })).toHaveAttribute("href", GROUP);
  await expect(cortes.getByRole("button", { name: /Seu pedido/ })).toHaveCount(0);
  await cortes.getByRole("button", { name: "Ver fotos e vídeos: Degradê" }).click();
  const viewer = page.getByRole("dialog", { name: "Degradê" });
  await expect(viewer).toContainText("1 de 2");
  await expect(viewer).toContainText("Na máquina");
  // O vídeo abre de verdade no navegador (lê as dimensões pelo endereço do site).
  const ok = await viewer.locator("video").evaluate(
    (v: HTMLVideoElement) =>
      new Promise<boolean>((resolve) => {
        v.preload = "metadata";
        v.onloadedmetadata = () => resolve(v.videoWidth === 320);
        v.onerror = () => resolve(false);
        v.load();
      }),
  );
  expect(ok).toBe(true);
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(axe.violations).toEqual([]);
  await viewer.getByRole("button", { name: "Fechar" }).click();
  await cortes.getByRole("button", { name: "Fechar" }).click();

  await page.getByRole("button", { name: /Meu time/ }).click();
  const team = page.getByRole("dialog", { name: "Meu time" });
  await expect(team.getByRole("link", { name: "Agendar com Rei" })).toHaveAttribute("href", GROUP);
  await team.getByRole("button", { name: /Davi/ }).click();
  await expect(team.getByRole("heading", { name: "Davi" })).toBeVisible();
  await expect(team.getByRole("button", { name: /Davi/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("link", { name: "Conversar no WhatsApp" })).toHaveAttribute(
    "href",
    GROUP,
  );

  // Editor: o bloco aparece como "Equipe" e o catálogo no modo Agendar.
  await page.goto(`/admin/clientes/${clientId}/editor`);
  await page.getByRole("button", { name: "Meu time · Equipe", exact: true }).click();
  await expect(page.getByLabel("Pessoa 2 — nome")).toHaveValue("Davi");
  await page.getByRole("button", { name: "Serviços e preços · Catálogo", exact: true }).click();
  await expect(page.getByLabel("Como funciona")).toHaveValue("book");

  // Vídeo em uso não pode ser excluído.
  await page.goto(`/admin/clientes/${clientId}/imagens`);
  await page
    .locator("li")
    .filter({ hasText: "degrade.webm" })
    .getByRole("button", { name: "Excluir vídeo" })
    .click();
  await expect(page.getByText(/vídeo está em uso no site/)).toBeVisible();

  // Exclusão do cliente leva os vídeos junto.
  await page.goto(`/admin/clientes/${clientId}`);
  await page.getByLabel(/Para confirmar/).fill(slug);
  await page.getByRole("button", { name: "Excluir cliente definitivamente" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  expect(
    (
      await page.request.get(`/media/${videoId}/video.webm`, { headers: { range: "bytes=0-9" } })
    ).status(),
  ).toBe(404);
});
