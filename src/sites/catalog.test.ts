import { describe, expect, it } from "vitest";
import { briefingSchema } from "@/clients/briefing";
import { collectImageRefs, validateBio, type BioDocument, type BlockOf } from "./bio";
import {
  decodeOrder,
  encodeOrder,
  formatPrice,
  nextItemId,
  orderTotal,
  parsePrice,
} from "./catalog";
import { trackTargets } from "./metrics";
import { newBlock } from "./operations";
import { createBioDocument } from "./templates";

const IMG = { assetId: "11111111-1111-4111-8111-111111111111", alt: "Batom" };
const IMG2 = { assetId: "22222222-2222-4222-8222-222222222222", alt: "Bolsa" };

function doc(): BioDocument {
  return createBioDocument({
    segment: "beauty",
    briefing: briefingSchema.parse({ businessName: "Loja Teste", whatsapp: "5585999998888" }),
  });
}

function catalog(): BlockOf<"catalog"> {
  return {
    id: "catalogo",
    type: "catalog",
    hidden: false,
    title: "Nossos produtos",
    categories: [
      {
        id: "c1",
        name: "Batons",
        tag: "Mais vendidos",
        products: [
          { id: "p1", name: "Batom vermelho", priceCents: 2990, image: IMG },
          { id: "p2", name: "Batom nude", image: IMG },
        ],
      },
      {
        id: "c2",
        name: "Bolsas",
        cover: IMG2,
        products: [{ id: "p1", name: "Bolsa", image: IMG2 }],
      },
    ],
  };
}

const paths = (d: BioDocument) => {
  const r = validateBio(d);
  return r.ok ? [] : r.issues.map((i) => i.path);
};

describe("preço digitado no editor", () => {
  it("aceita os formatos comuns e devolve centavos", () => {
    expect(parsePrice("29,90")).toBe(2990);
    expect(parsePrice("R$ 29,9")).toBe(2990);
    expect(parsePrice("45")).toBe(4500);
    expect(parsePrice("1.299,00")).toBe(129900);
    expect(parsePrice("")).toBeUndefined();
    expect(parsePrice("  ")).toBeUndefined();
  });
  it("recusa texto, ponto como decimal e valores absurdos", () => {
    expect(parsePrice("abc")).toBeNull();
    expect(parsePrice("29.90")).toBeNull();
    expect(parsePrice("12,345")).toBeNull();
    expect(parsePrice("999999999")).toBeNull();
  });
  it("mostra com vírgula e dois decimais", () => {
    expect(formatPrice(2990)).toBe("29,90");
    expect(formatPrice(129900)).toBe("1.299,00");
    expect(formatPrice(undefined)).toBe("");
  });
  it("ids novos não repetem", () => {
    expect(nextItemId(["c1", "c2"], "c")).toBe("c3");
    expect(nextItemId(["p2"], "p")).toBe("p1");
  });
});

describe("catálogo com carrinho (D48)", () => {
  it("catálogo com categorias, etiqueta, capa e preço opcional é válido", () => {
    const d = doc();
    d.blocks.unshift(catalog());
    expect(paths(d)).toEqual([]);
  });

  it("no máximo 10 produtos por categoria e 12 categorias", () => {
    const d = doc();
    const c = catalog();
    c.categories[0].products = Array.from({ length: 11 }, (_, i) => ({
      id: `p${i + 1}`,
      name: `Produto ${i + 1}`,
      image: IMG,
    }));
    d.blocks.unshift(c);
    expect(paths(d)).toEqual(["blocks.0.categories.0.products"]);

    const many = doc();
    const m = catalog();
    m.categories = Array.from({ length: 13 }, (_, i) => ({ ...m.categories[1], id: `c${i + 1}` }));
    many.blocks.unshift(m);
    expect(paths(many)).toEqual(["blocks.0.categories"]);
  });

  it("recusa ids repetidos, preço negativo, dois catálogos e catálogo sem WhatsApp", () => {
    const dup = doc();
    const c = catalog();
    c.categories[1].id = "c1";
    c.categories[0].products[1].id = "p1";
    dup.blocks.unshift(c);
    expect(paths(dup).sort()).toEqual([
      "blocks.0.categories.0.products.1.id",
      "blocks.0.categories.1.id",
    ]);

    const neg = doc();
    const n = catalog();
    n.categories[0].products[0].priceCents = -1;
    neg.blocks.unshift(n);
    expect(paths(neg)).toEqual(["blocks.0.categories.0.products.0.priceCents"]);

    const two = doc();
    two.blocks.unshift(catalog(), { ...catalog(), id: "catalogo-2" });
    expect(paths(two)).toEqual(["blocks"]);

    const noWa = doc();
    delete noWa.contact.whatsapp;
    noWa.blocks = noWa.blocks.filter((b) => !(b.type === "link" && b.action === "whatsapp"));
    noWa.floatingWhatsapp = false;
    noWa.blocks.unshift(catalog());
    expect(paths(noWa)).toEqual(["contact.whatsapp"]);
  });

  it("fotos dos produtos e das capas contam como imagens do cliente", () => {
    const d = doc();
    d.blocks.unshift(catalog());
    const ids = collectImageRefs(d).map((r) => r.assetId);
    expect(ids).toContain(IMG.assetId);
    expect(ids).toContain(IMG2.assetId);
  });

  it("métricas aceitam abrir categoria, adicionar cada produto e enviar o pedido", () => {
    const d = doc();
    d.blocks.unshift(catalog());
    const t = trackTargets(d);
    expect(t.get("k:c1")).toEqual({ target: "catalog", label: "Batons" });
    expect(t.get("p:c1:p2")).toEqual({ target: "catalog:add", label: "Batom nude (Batons)" });
    expect(t.get("p:c2:p1")?.label).toBe("Bolsa (Bolsas)");
    expect(t.get("order")?.target).toBe("catalog:order");
    // Chave mais longa possível cabe no limite do servidor (60).
    expect(`p:${"a".repeat(20)}:${"b".repeat(20)}`.length).toBeLessThanOrEqual(60);
  });

  it("bloco novo pelo editor é válido e só existe um por Bio Site", () => {
    const d = doc();
    const b = newBlock(d, "catalog", IMG);
    expect(b).not.toBeNull();
    d.blocks.push(b!);
    expect(paths(d)).toEqual([]);
    expect(newBlock(d, "catalog", IMG)).toBeNull();
    expect(newBlock(doc(), "catalog")).toBeNull();
  });
});

describe("cor dos cartões, página clara e logo com nome (Mage Beauty)", () => {
  const mage = () => {
    const d = doc();
    d.theme.cardStyle = "deep";
    d.theme.lightPage = true;
    d.theme.colors.base = "#e0c7b1";
    d.theme.colors.ink = "#8a6420";
    d.theme.colors.inkMuted = "#8a6420";
    d.theme.colors.accent = "#5e4310";
    d.theme.colors.cardTop = "#4a3020";
    d.theme.colors.cardBottom = "#2e1d12";
    d.theme.cardText = "#f3d9b1";
    d.theme.neonEdges = { start: "#c99a78", end: "#e9c29e" };
    d.profile.logo = IMG;
    d.profile.logoFrame = "none";
    d.profile.logoHasName = true;
    return d;
  };

  it("cacau com texto dourado claro sobre fundo nude: válido", () => {
    expect(paths(mage())).toEqual([]);
  });

  it("recusa texto dos cartões sem contraste e nome sumindo no fundo claro", () => {
    const d = mage();
    d.theme.cardText = "#6b4a2a";
    expect([...new Set(paths(d))]).toEqual(["theme.cardText"]);
    const light = mage();
    light.theme.colors.base = "#9a8a70";
    expect(paths(light)).toContain("theme.colors.ink");
  });
});

describe('link "Fotos do pedido" (D49)', () => {
  it("vai e volta: categoria, produto e quantidade", () => {
    const param = encodeOrder([
      { cat: "c1", prod: "p2", qty: 3 },
      { cat: "c2", prod: "p1", qty: 1 },
    ]);
    expect(param).toBe("c1.p2.3_c2.p1.1");
    const lines = decodeOrder(catalog(), param);
    expect(lines.map((l) => [l.prod.name, l.cat.name, l.qty])).toEqual([
      ["Batom nude", "Batons", 3],
      ["Bolsa", "Bolsas", 1],
    ]);
  });

  it("ignora itens fora do catálogo, quantidade zero, repetidos e lixo", () => {
    const lines = decodeOrder(
      catalog(),
      "c1.p1.0_c9.p1.1_c1.p1.2_c1.p1.5_<script>_c1.p9.1_c2.p1.100",
    );
    expect(lines.map((l) => `${l.cat.id}.${l.prod.id}.${l.qty}`)).toEqual(["c1.p1.2"]);
    expect(decodeOrder(catalog(), undefined)).toEqual([]);
    expect(decodeOrder(catalog(), "x".repeat(3000))).toEqual([]);
  });

  it("total só quando todos os itens têm preço", () => {
    const c = catalog();
    expect(orderTotal(decodeOrder(c, "c1.p1.2"))).toBe(5980);
    expect(orderTotal(decodeOrder(c, "c1.p1.2_c1.p2.1"))).toBeNull();
  });
});
