import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { AUTH_FILE } from "../playwright.config";

// Diarista com orçamento por perguntas e vídeos em destaque (Casa Limpa): perguntas de tocar →
// mensagem pronta no WhatsApp, vídeos lado a lado que abrem grandes, bolhas e área de atendimento.
test.use({ storageState: AUTH_FILE });

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
        if (t < 1200) requestAnimationFrame(f);
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

test("orçamento por perguntas no WhatsApp e vídeos em destaque", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "fluxo do painel: uma vez basta");
  test.slow();
  const slug = "limpeza-e2e";

  await page.goto("/admin");
  await page.getByRole("link", { name: "Novo cliente" }).click();
  await page.getByLabel("Nome do cliente").fill("Limpeza E2E");
  await page.getByLabel("Segmento").selectOption("services");
  await page.getByLabel("Endereço do Bio Site").fill(slug);
  await page.getByRole("button", { name: "Criar cliente" }).click();
  await expect(page).toHaveURL(/\/admin\/clientes\/[0-9a-f-]{36}\/briefing$/);
  const clientId = /clientes\/([0-9a-f-]{36})/.exec(page.url())![1];
  await page.getByLabel("WhatsApp").fill("85987154785");
  await page.getByRole("button", { name: "Salvar cadastro" }).click();
  await expect(page.getByText("Cadastro salvo.")).toBeVisible();

  await page.getByRole("link", { name: "Imagens" }).click();
  const webm = await recordWebm(page);
  await page
    .getByLabel("Selecionar vídeos")
    .setInputFiles({ name: "banheiro.webm", mimeType: "video/webm", buffer: webm });
  await page.getByRole("button", { name: "Carregar vídeos" }).click();
  await expect(page.getByText("banheiro.webm enviado.")).toBeVisible();
  const videoId = (await page
    .locator("li")
    .filter({ hasText: "banheiro.webm" })
    .getByText(/^id: /)
    .textContent())!
    .replace("id: ", "")
    .trim();

  await page.getByRole("link", { name: "Bio Site", exact: true }).click();
  await page.getByRole("button", { name: "Criar Bio Site" }).click();
  await expect(page.getByText("Ainda não publicado.")).toBeVisible();
  const textarea = page.getByLabel("Documento do Bio Site (JSON)");
  const doc = JSON.parse(await textarea.inputValue());
  doc.theme.cardStyle = "deep";
  doc.theme.effects = "bubbles";
  doc.theme.iconsLight = true;
  doc.profile.serviceArea = "Atendimento em toda Fortaleza e região metropolitana";
  doc.blocks.unshift(
    {
      id: "trabalhos",
      type: "videos",
      hidden: false,
      title: "Meus trabalhos",
      subtitle: "Toque para assistir",
      autoplay: true,
      videos: [{ videoId, title: "Banheiro e cozinha" }],
    },
    {
      id: "orcamento",
      type: "quote",
      hidden: false,
      title: "Pedir orçamento",
      intro: "O valor depende do tamanho da casa.",
      note: "Eu uso os produtos de limpeza da sua casa.",
      greeting: "Oi! Vim pelo Bio Site e gostaria de um orçamento.",
      colors: { top: "#1f6ee0", bottom: "#1a56c4" },
      questions: [
        {
          id: "q1",
          label: "O que você precisa limpar?",
          kind: "multi",
          options: ["Casa toda", "Cozinha", "Banheiros"],
          required: true,
        },
        {
          id: "q2",
          label: "Quartos",
          kind: "single",
          options: ["1", "2", "3"],
          required: true,
        },
        { id: "q3", label: "Bairro e cidade", kind: "text", options: [], required: true },
      ],
    },
  );
  await textarea.fill(JSON.stringify(doc, null, 2));
  await page.getByRole("button", { name: "Validar e salvar" }).click();
  await expect(page.getByText("Rascunho salvo.")).toBeVisible();

  await page.goto(`/preview/${clientId}`);
  await expect(page.locator(".bio--fx-bubbles .bio-bubbles")).toBeAttached();
  await expect(page.locator(".bio-sign")).toContainText(
    "Atendimento em toda Fortaleza e região metropolitana",
  );
  await page.evaluate(() => {
    (window as unknown as { open: (u: string) => void }).open = (u) => {
      (window as unknown as { __u: string }).__u = u;
    };
  });

  // Orçamento: o envio só libera com as obrigatórias; a mensagem leva as respostas.
  await page.getByRole("button", { name: /Pedir orçamento/ }).click();
  const quote = page.getByRole("dialog", { name: "Pedir orçamento" });
  const send = quote.getByRole("button", { name: "Enviar pelo WhatsApp" });
  await expect(send).toHaveAttribute("aria-disabled", "true");
  await quote.getByRole("button", { name: "Casa toda" }).click();
  await quote.getByRole("button", { name: "Banheiros" }).click();
  await expect(quote.getByRole("button", { name: "Banheiros" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await quote.getByRole("button", { name: "2", exact: true }).click();
  await quote.getByRole("button", { name: "3", exact: true }).click();
  await expect(quote.getByRole("button", { name: "2", exact: true })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await expect(quote).toContainText("Falta responder: bairro e cidade.");
  // Toque mesmo assim (forçado): nada abre.
  await send.click({ force: true });
  expect(await page.evaluate(() => (window as unknown as { __u?: string }).__u)).toBeUndefined();
  await quote.getByLabel("Bairro e cidade").fill("Messejana, Fortaleza");
  await expect(send).toHaveAttribute("aria-disabled", "false");
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(axe.violations).toEqual([]);
  await send.click();
  const url = new URL((await page.evaluate(() => (window as unknown as { __u: string }).__u))!);
  expect(url.origin + url.pathname).toBe("https://wa.me/5585987154785");
  expect(url.searchParams.get("text")).toBe(
    [
      "Oi! Vim pelo Bio Site e gostaria de um orçamento.",
      "• O que você precisa limpar: Casa toda, Banheiros",
      "• Quartos: 3",
      "• Bairro e cidade: Messejana, Fortaleza",
    ].join("\n"),
  );
  await quote.getByRole("button", { name: "Fechar" }).click();

  // Vídeos: o primeiro toca sozinho, sem som; tocar abre o vídeo grande, com controles.
  const tile = page.getByRole("button", { name: "Assistir: Banheiro e cozinha" });
  await expect(tile.locator("video")).toHaveJSProperty("muted", true);
  await tile.click();
  const player = page.getByRole("dialog", { name: "Banheiro e cozinha" }).locator("video");
  await expect(player).toHaveAttribute("controls", "");
  await expect(player.locator("source")).toHaveAttribute("src", `/media/${videoId}/video.webm`);

  // Editor: os blocos novos aparecem com os nomes certos.
  await page.goto(`/admin/clientes/${clientId}/editor`);
  await page.getByRole("button", { name: "Pedir orçamento · Orçamento", exact: true }).click();
  await expect(page.getByLabel("Pergunta 3", { exact: true })).toHaveValue("Bairro e cidade");
  await page.getByRole("button", { name: "Meus trabalhos · Vídeos", exact: true }).click();
  await expect(page.getByLabel("Vídeo 1 — nome (opcional)")).toHaveValue("Banheiro e cozinha");

  await page.goto(`/admin/clientes/${clientId}`);
  await page.getByLabel(/Para confirmar/).fill(slug);
  await page.getByRole("button", { name: "Excluir cliente definitivamente" }).click();
  await expect(page).toHaveURL(/\/admin$/);
});
