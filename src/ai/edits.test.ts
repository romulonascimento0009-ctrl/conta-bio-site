import { describe, expect, it } from "vitest";
import { briefingSchema } from "@/clients/briefing";
import { validateBio, type BioDocument, type BlockOf } from "@/sites/bio";
import { createBioDocument } from "@/sites/templates";
import { allowedUrlsOf, aiEditSchema, applyAiEdits, type AiEdit } from "./edits";
import { costMicros, formatUsd, withinBudget, worstCaseMicros } from "./pricing";

const CATALOG = "https://catalogo.exemplo.com.br/park";

function doc(): BioDocument {
  return createBioDocument({
    segment: "services",
    briefing: briefingSchema.parse({
      businessName: "Park Vision",
      city: "Fortaleza/CE",
      instagram: "parkvision",
      whatsapp: "5585999998888",
      googleReviewUrl: "https://g.page/r/park/review",
      mainLinkUrl: CATALOG,
    }),
  });
}

const run = (edits: AiEdit["edits"], d = doc()) =>
  applyAiEdits(d, { summary: " Resumo. ", edits }, allowedUrlsOf(d, [CATALOG]));

describe("alterações da IA", () => {
  it("resposta típica de montagem: aplica tudo e o resultado é válido e no padrão", () => {
    const r = run([
      {
        type: "set_profile",
        tagline: "Brinquedos seguros e revisados para o seu parque",
        categories: ["Parques", "Buffets", "Shoppings", "Garantia"],
      },
      { type: "set_ticker", enabled: true, items: ["Atendemos todo o Ceará", "Laudo técnico"] },
      {
        type: "update_card",
        id: "whatsapp",
        title: "Pedir orçamento",
        subtitle: "Resposta rápida",
      },
      {
        type: "add_text",
        after_id: null,
        title: "Sobre nós",
        body: "Manutenção preventiva e corretiva de playgrounds.",
      },
    ]);
    expect(r.skipped).toEqual([]);
    expect(r.applied).toHaveLength(4);
    expect(r.summary).toBe("Resumo.");
    expect(validateBio(r.document).ok).toBe(true);
    expect(r.document.profile.categories).toEqual(["PARQUES", "BUFFETS", "SHOPPINGS", "GARANTIA"]);
    expect(r.document.theme.cardStyle).toBe("glass");
    expect(r.document.ticker).toMatchObject({ enabled: true });
  });

  it("descarta, com o motivo, o que deixaria o Bio Site inválido ou inventado", () => {
    const r = run([
      { type: "set_profile", categories: ["MANUTENÇÃO DE BRINQUEDOS E GARANTIA"] },
      { type: "add_card", after_id: null, action: "url", title: "Loja", url: "https://golpe.com" },
      { type: "update_card", id: "nao-existe", title: "X" },
      { type: "set_colors", accent: "#2a2a2a" },
      { type: "update_card", id: "whatsapp", title: "Fale com a gente" },
    ]);
    expect(r.applied).toEqual(["Cartão “Fale com a gente”"]);
    expect(r.skipped.map((s) => s.what)).toEqual([
      "Slogan e categorias",
      "Novo cartão “Loja”",
      "Cartão “X”",
      "Cores do topo",
    ]);
    expect(r.skipped[1].why).toMatch(/não inventa links/);
    expect(r.skipped[3].why).toMatch(/contraste/);
    expect(validateBio(r.document).ok).toBe(true);
  });

  it("cartão novo só com link do cadastro e com o dado de contato preenchido", () => {
    const d = doc();
    delete d.contact.phone;
    const r = run(
      [
        { type: "add_card", after_id: "whatsapp", action: "url", title: "Catálogo", url: CATALOG },
        { type: "add_card", after_id: null, action: "phone", title: "Ligar" },
      ],
      d,
    );
    expect(r.applied).toEqual(["Novo cartão “Catálogo”"]);
    expect(r.skipped[0].why).toMatch(/Contato/);
    const ids = r.document.blocks.map((b) => b.id);
    expect(ids[ids.indexOf("whatsapp") + 1]).toMatch(/^cartao/);
  });

  it("reordena pelos ids conhecidos e mantém os não citados no fim", () => {
    const d = doc();
    const ids = d.blocks.map((b) => b.id);
    const r = run([{ type: "reorder", ids: [ids[2], "fantasma", ids[0]] }], d);
    expect(r.document.blocks.map((b) => b.id)).toEqual([
      ids[2],
      ids[0],
      ...ids.filter((id) => id !== ids[2] && id !== ids[0]),
    ]);
  });

  it("destaque escolhido pela IA vira neon; não altera contatos", () => {
    const before = doc();
    const r = run([{ type: "update_card", id: "instagram", featured: true }], before);
    const insta = r.document.blocks.find((b) => b.id === "instagram") as BlockOf<"link">;
    expect(insta).toMatchObject({ featured: true, featureStyle: "neon" });
    expect(r.document.contact).toEqual(before.contact);
  });

  it("o schema aceita a resposta estruturada e recusa tipo desconhecido", () => {
    expect(aiEditSchema.safeParse({ summary: "ok", edits: [] }).success).toBe(true);
    expect(
      aiEditSchema.safeParse({ summary: "ok", edits: [{ type: "set_html", html: "<b>" }] }).success,
    ).toBe(false);
  });
});

describe("custo e teto", () => {
  it("custo em milionésimos de dólar pelo preço do modelo", () => {
    // 10 mil de entrada ($4/M) + 2 mil de saída ($20/M) = 0,04 + 0,04 = US$ 0,08
    expect(
      costMicros("claude-opus-5-5", { input: 10_000, output: 2_000, cacheRead: 0, cacheWrite: 0 }),
    ).toBe(80_000);
    // Modelo desconhecido: cobra pelo mais caro (o teto nunca fica por baixo).
    expect(
      costMicros("modelo-novo", { input: 1_000_000, output: 0, cacheRead: 0, cacheWrite: 0 }),
    ).toBe(10_000_000);
  });

  it("teto: bloqueia quando o pior caso da próxima chamada passaria do limite", () => {
    const worst = worstCaseMicros(8_000);
    expect(withinBudget(0, 10, worst)).toBe(true);
    expect(withinBudget(10_000_000 - worst + 1, 10, worst)).toBe(false);
    expect(formatUsd(80_000)).toMatch(/0,08/);
  });
});
