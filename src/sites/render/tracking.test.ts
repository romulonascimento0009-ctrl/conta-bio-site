import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { AssetInfo } from "@/data/assets";
import { briefingSchema } from "@/clients/briefing";
import type { BioDocument } from "@/sites/bio";
import { trackTargets } from "@/sites/metrics";
import { createBioDocument } from "@/sites/templates";
import { BioRenderer } from "./BioRenderer";

// next/font só funciona no build do Next; aqui basta o nome da família.
vi.mock("./fonts", () => ({ loadedFont: () => ({ family: "sans-serif" }) }));

const IMG = "0b6c3f4e-8a51-4c43-9f1e-2d3c4b5a6f70";

/** Documento com todos os tipos de cartão e painel (o que vier de novo entra aqui). */
function fullDoc(): BioDocument {
  const doc = createBioDocument({
    segment: "services",
    briefing: briefingSchema.parse({
      businessName: "Oficina Teste",
      instagram: "oficina",
      whatsapp: "5585999998888",
      phone: "5585999998888",
      address: "Rua A, 1, Fortaleza/CE",
      googleReviewUrl: "https://g.page/r/teste/review",
      wifiNetwork: "OFICINA",
      wifiPassword: "segredo123",
      hours: "Seg a sex | 8h – 18h",
    }),
  });
  doc.blocks.push(
    {
      id: "meus-servicos",
      type: "gallery",
      hidden: false,
      title: "Meus serviços",
      display: "card",
      icon: "wheel",
      images: [{ assetId: IMG, alt: "", title: "Alinhamento" }],
    },
    {
      id: "pix",
      type: "pix",
      hidden: false,
      title: "Pagar com Pix",
      key: "a@b.com",
      name: "Oficina",
      city: "Fortaleza",
      showQr: false,
    },
  );
  return doc;
}

describe("métricas: todo toque da página é aceito pelo servidor", () => {
  it("cada data-track desenhado está na lista de cliques aceitos", () => {
    const doc = fullDoc();
    const assets = new Map<string, AssetInfo>([
      [IMG, { id: IMG, width: 800, height: 600, variants: [480, 800] }],
    ]);
    const html = renderToStaticMarkup(
      createElement(BioRenderer, { doc, assets, trackSlug: "oficina-teste" }),
    );
    const keys = [...html.matchAll(/data-track="([^"]+)"/g)].map((m) => m[1]);
    const accepted = trackTargets(doc);

    expect(keys.length).toBeGreaterThan(5);
    expect(keys).toContain("b:meus-servicos");
    expect(keys).toContain("b:pix");
    expect(keys).toContain("b:wifi");
    // Uma chave desenhada mas recusada no servidor = toque perdido nas métricas.
    expect(keys.filter((k) => !accepted.has(k))).toEqual([]);
  });
});
