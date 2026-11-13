import { describe, expect, it } from "vitest";
import { briefingSchema } from "@/clients/briefing";
import { collectImageRefs, validateBio, type BioDocument, type BlockOf } from "./bio";
import { trackTargets } from "./metrics";
import { applyOperation, newBlock } from "./operations";
import { createBioDocument } from "./templates";

/** Vitrine (D57, Ótica do Brasileiro): layout de loja, destaques, ofertas e catálogo em grade. */

const IMG = (n: number) => ({
  assetId: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
  alt: "",
});

function shopDoc(): BioDocument {
  const doc = createBioDocument({
    segment: "health",
    briefing: briefingSchema.parse({
      businessName: "Ótica Teste",
      whatsapp: "558585763863",
      instagram: "otica",
      address: "Av. A, 1",
    }),
  });
  doc.theme = {
    ...doc.theme,
    colors: {
      ...doc.theme.colors,
      base: "#eef3fd",
      cardTop: "#0349b8",
      cardBottom: "#062a66",
      accent: "#062a66",
      ink: "#0e1b33",
      inkMuted: "#566176",
      glow1: "#dce7fb",
      glow2: "#fff4cc",
    },
    chips: { bg: "#fccf04", fg: "#062a66" },
    layout: "shop",
  };
  delete doc.theme.cardStyle;
  delete doc.theme.neonEdges;
  doc.blocks = [
    {
      id: "destaques",
      type: "stories",
      hidden: false,
      title: "Destaques",
      items: [
        {
          id: "ofertas",
          name: "Ofertas",
          cover: IMG(1),
          slides: [
            { id: "q1", image: IMG(2), title: "Sol 30% off", button: "Quero esta oferta" },
            { id: "q2", image: IMG(3) },
          ],
        },
        { id: "lentes", name: "Lentes", cover: IMG(4), slides: [{ id: "q1", image: IMG(5) }] },
      ],
    },
    {
      id: "ofertas",
      type: "promos",
      hidden: false,
      items: [
        { id: "semana", size: "large", title: "Armação + lentes", image: IMG(6) },
        { id: "sol", size: "small", title: "Óculos de sol" },
      ],
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
              name: "Redondo",
              priceCents: 18900,
              compareAtCents: 23900,
              tags: ["Unissex"],
              image: { ...IMG(7), title: "Frente" },
              media: [{ kind: "image", ...IMG(8), title: "Diagonal" }],
            },
          ],
        },
      ],
    },
    { id: "sobre", type: "text", hidden: false, title: "Sobre", body: "Texto.", showAddress: true },
  ];
  return doc;
}

describe("Vitrine", () => {
  it("documento da Vitrine é válido", () => {
    const r = validateBio(shopDoc());
    expect(r.ok ? [] : r.issues).toEqual([]);
  });

  it("destaques e ofertas entram na conferência de posse das imagens", () => {
    const ids = collectImageRefs(shopDoc()).map((r) => r.assetId);
    for (const n of [1, 2, 3, 4, 5, 6, 7, 8]) expect(ids).toContain(IMG(n).assetId);
  });

  it("preço “de” precisa ser maior que o preço", () => {
    const d = shopDoc();
    const p = (d.blocks[2] as BlockOf<"catalog">).categories[0].products[0];
    p.compareAtCents = 18900;
    const r = validateBio(d);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues[0].message).toMatch(/preço "de"/);
  });

  it("recusa ids repetidos nos destaques e nas ofertas", () => {
    const d = shopDoc();
    (d.blocks[0] as BlockOf<"stories">).items[1].id = "ofertas";
    (d.blocks[1] as BlockOf<"promos">).items[1].id = "semana";
    const r = validateBio(d);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.length).toBe(2);
  });

  it("recusa texto suave sem contraste no degradê da página", () => {
    const d = shopDoc();
    d.theme.colors.inkMuted = "#9aa3b2";
    const r = validateBio(d);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.some((i) => /texto suave/.test(i.message))).toBe(true);
  });

  it("o layout sobrevive à troca de tema pronto", () => {
    const d = applyOperation(shopDoc(), { type: "theme-preset", themeId: "oceano" });
    expect(d.theme.layout).toBe("shop");
    expect(d.theme.chips).toEqual({ bg: "#fccf04", fg: "#062a66" });
  });

  it("blocos novos nascem válidos (destaques precisam de uma imagem)", () => {
    const d = shopDoc();
    expect(newBlock(d, "stories")).toBeNull();
    const s = newBlock(d, "stories", IMG(9))!;
    const o = newBlock(d, "promos")!;
    expect(s.id).toBe("destaques-2");
    expect(o.id).toBe("ofertas-2");
    let next = applyOperation(d, { type: "block-add", block: s });
    next = applyOperation(next, { type: "block-add", block: o });
    const r = validateBio(next);
    expect(r.ok ? [] : r.issues).toEqual([]);
  });

  it("métricas: abrir destaque, botão do destaque, oferta, ver e pedir produto", () => {
    const t = trackTargets(shopDoc());
    expect(t.get("d:destaques:ofertas")?.target).toBe("stories");
    expect(t.get("dw:destaques:ofertas")?.target).toBe("stories:whatsapp");
    // Destaque sem botão em nenhum quadro não aceita o toque do botão.
    expect(t.has("dw:destaques:lentes")).toBe(false);
    expect(t.get("o:ofertas:semana")?.target).toBe("promo");
    expect(t.get("p:grau:redondo")?.target).toBe("catalog:view");
    expect(t.get("w:grau:redondo")?.target).toBe("catalog:whatsapp");
    // Na Vitrine não há carrinho nem categorias para abrir.
    expect(t.has("order")).toBe(false);
    expect(t.has("k:grau")).toBe(false);
  });

  it("fora do layout Vitrine, o catálogo no modo Vitrine conta como pedido", () => {
    const d = shopDoc();
    delete d.theme.layout;
    const t = trackTargets(d);
    expect(t.get("p:grau:redondo")?.target).toBe("catalog:add");
    expect(t.has("order")).toBe(true);
  });
});
