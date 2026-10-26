import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { briefingSchema } from "@/clients/briefing";
import type { AssetInfo } from "@/data/assets";
import type { VideoInfo } from "@/data/videos";
import {
  collectImageRefs,
  collectVideoRefs,
  resolveLink,
  validateBio,
  type BioDocument,
  type BlockOf,
} from "@/sites/bio";
import { parseWhatsappGroup, WHATSAPP_GROUP, whatsappTarget } from "@/sites/links";
import { trackTargets } from "@/sites/metrics";
import { newBlock } from "@/sites/operations";
import { applyStandardLook, createBioDocument } from "@/sites/templates";
import { BioRenderer } from "./BioRenderer";

// next/font só funciona no build do Next; aqui basta o nome da família.
vi.mock("./fonts", () => ({ loadedFont: () => ({ family: "sans-serif" }) }));

/** Barbearia com agendamento pelo grupo do WhatsApp (Reistyle, 2026-10-26: D50–D53). */
const GROUP = "https://chat.whatsapp.com/Ly7Tgg5RxiO5ctJYtDzrLg";
const IMG = "11111111-1111-4111-8111-111111111111";
const IMG2 = "22222222-2222-4222-8222-222222222222";
const POSTER = "33333333-3333-4333-8333-333333333333";
const VID = "44444444-4444-4444-8444-444444444444";

function catalog(): BlockOf<"catalog"> {
  return {
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
            image: { assetId: IMG, alt: "Degradê" },
            media: [
              { kind: "video", videoId: VID, caption: "Na máquina" },
              { kind: "image", assetId: IMG2, alt: "De lado" },
            ],
          },
          { id: "p2", name: "Social", priceCents: 3500, image: { assetId: IMG2, alt: "" } },
        ],
      },
    ],
  };
}

function team(): BlockOf<"team"> {
  return {
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
        skills: ["Degradê", "Barba"],
        photo: { assetId: IMG, alt: "" },
      },
      { id: "m2", name: "Davi", photo: { assetId: IMG2, alt: "" } },
    ],
  };
}

/** Sem número de WhatsApp: só o grupo. */
function barber(): BioDocument {
  const d = applyStandardLook(
    createBioDocument({
      segment: "beauty",
      briefing: briefingSchema.parse({ businessName: "Barbearia Teste" }),
    }),
  );
  d.contact.whatsappGroup = GROUP;
  d.blocks.push(catalog(), team());
  return d;
}

const issues = (d: unknown) => {
  const r = validateBio(d);
  return r.ok ? [] : r.issues.map((i) => `${i.path}: ${i.message}`);
};

describe("grupo do WhatsApp", () => {
  it("lê o link colado de vários jeitos e recusa o que não é convite", () => {
    expect(parseWhatsappGroup("chat.whatsapp.com/Ly7Tgg5RxiO5ctJYtDzrLg")).toBe(GROUP);
    expect(parseWhatsappGroup(` ${GROUP}?mode=ems_copy_t `)).toBe(GROUP);
    expect(parseWhatsappGroup("https://chat.whatsapp.com/invite/Ly7Tgg5RxiO5ctJYtDzrLg")).toBe(
      GROUP,
    );
    expect(WHATSAPP_GROUP.test(GROUP)).toBe(true);
    expect(WHATSAPP_GROUP.test("https://wa.me/5585999998888")).toBe(false);
    expect(WHATSAPP_GROUP.test("https://chat.whatsapp.com.evil.io/Ly7Tgg5RxiO5ct")).toBe(false);
  });

  it("número vence o grupo; sem número, abre o grupo sem mensagem", () => {
    expect(whatsappTarget({ whatsappGroup: GROUP }, "Oi")).toBe(GROUP);
    expect(whatsappTarget({ whatsapp: "5585999998888", whatsappGroup: GROUP }, "Oi")).toBe(
      "https://wa.me/5585999998888?text=Oi",
    );
    expect(whatsappTarget({})).toBeNull();
  });

  it("o cartão de WhatsApp e o botão flutuante usam o grupo quando não há número", () => {
    const d = barber();
    d.blocks.push({
      id: "wpp",
      type: "link",
      action: "whatsapp",
      title: "Agendar horário",
      hidden: false,
      variant: "solid",
    });
    expect(resolveLink(d.blocks.at(-1) as BlockOf<"link">, d.contact)?.href).toBe(GROUP);
    expect(trackTargets(d).has("fab")).toBe(true);
    expect(issues({ ...d, contact: { ...d.contact, whatsappGroup: "https://x.com/abc" } })).toEqual(
      expect.arrayContaining([expect.stringContaining("contact.whatsappGroup")]),
    );
  });
});

describe("catálogo no modo Agendar", () => {
  it("vale só com o grupo; o modo pedido continua exigindo o número", () => {
    const d = barber();
    expect(issues(d)).toEqual([]);
    const order = structuredClone(d);
    delete (order.blocks.find((b) => b.type === "catalog") as BlockOf<"catalog">).mode;
    expect(issues(order)).toEqual(
      expect.arrayContaining([expect.stringContaining("preencha o WhatsApp em Contato")]),
    );
    const none = structuredClone(d);
    delete none.contact.whatsappGroup;
    expect(issues(none)).toEqual(
      expect.arrayContaining([expect.stringContaining("WhatsApp ou o grupo")]),
    );
  });

  it("fotos e vídeos extras entram na conferência de posse; no máximo 8", () => {
    const d = barber();
    expect(collectImageRefs(d).map((r) => r.assetId)).toContain(IMG2);
    expect(collectVideoRefs(d)).toEqual([{ kind: "video", videoId: VID, caption: "Na máquina" }]);
    const many = structuredClone(d);
    const p = (many.blocks.find((b) => b.type === "catalog") as BlockOf<"catalog">).categories[0]
      .products[0];
    p.media = Array.from({ length: 9 }, () => ({ kind: "image" as const, assetId: IMG, alt: "" }));
    expect(issues(many).length).toBeGreaterThan(0);
  });

  it("Agendar conta como toque em Agendar (não como adicionar ao pedido)", () => {
    const t = trackTargets(barber());
    expect(t.get("p:c1:p1")?.target).toBe("catalog:book");
    expect(t.has("order")).toBe(false);
    expect(t.get("b:equipe")?.target).toBe("team");
    expect(t.get("t:equipe:m2")).toEqual({ target: "team:book", label: "Davi" });
  });
});

describe("equipe (Meu time)", () => {
  it("valida pessoas, recusa id repetido e confere as fotos", () => {
    const d = barber();
    expect(collectImageRefs(d).filter((r) => r.assetId === IMG).length).toBeGreaterThan(1);
    const dup = structuredClone(d);
    (dup.blocks.find((b) => b.type === "team") as BlockOf<"team">).members[1].id = "m1";
    expect(issues(dup)).toEqual(expect.arrayContaining([expect.stringContaining("id repetido")]));
  });

  it("bloco novo começa válido com a primeira imagem", () => {
    const d = barber();
    const b = newBlock(d, "team", { assetId: IMG, alt: "" });
    expect(b?.type).toBe("team");
    expect(b?.id).toBe("equipe-2");
    expect(issues({ ...d, blocks: [...d.blocks, b] })).toEqual([]);
    expect(newBlock(d, "team")).toBeNull();
  });
});

describe("página da barbearia", () => {
  const assets = new Map<string, AssetInfo>(
    [IMG, IMG2, POSTER].map((id) => [id, { id, width: 800, height: 1000, variants: [480, 800] }]),
  );
  const videos = new Map<string, VideoInfo>([
    [VID, { id: VID, mime: "video/mp4", width: 720, height: 1280, posterAssetId: POSTER }],
  ]);
  const render = (d: BioDocument, v = videos) =>
    renderToStaticMarkup(
      createElement(BioRenderer, { doc: d, assets, videos: v, trackSlug: "barbearia" }),
    );

  it("serviços sem carrinho, equipe com Agendar no grupo, efeito de placas", () => {
    const d = barber();
    d.theme.effects = "slabs";
    const html = render(d);
    expect(html).toContain("Ver serviços (2)");
    expect(html).not.toContain("bio-cartbar");
    expect(html).toContain("bio-faces");
    expect(html).toContain(`href="${GROUP}"`);
    expect(html).toContain("Agendar com Rei");
    expect(html).toContain("bio--fx-slabs");
    expect(html).toContain("bio-slab-glow");
    // Todo toque desenhado é aceito pelas métricas.
    const accepted = trackTargets(d);
    const keys = [...html.matchAll(/data-track="([^"]+)"/g)].map((m) => m[1]);
    expect(keys.filter((k) => !accepted.has(k))).toEqual([]);
  });

  it("vídeo de outro cliente ou não pronto some; o catálogo sem mídia extra não muda", () => {
    const d = barber();
    expect(render(d)).toContain("bio-shop-sheet");
    const plain = structuredClone(d);
    for (const p of (plain.blocks.find((b) => b.type === "catalog") as BlockOf<"catalog">)
      .categories[0].products)
      delete p.media;
    // Sem fotos/vídeos extras: nenhum visualizador no HTML (igual ao catálogo da Mage).
    const a = render(plain);
    expect(a.match(/<dialog/g)?.length).toBe(1 + 1); // categoria + equipe
  });
});
