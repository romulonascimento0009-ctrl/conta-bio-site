import { describe, expect, it } from "vitest";
import { briefingSchema, parseHours } from "@/clients/briefing";
import { SEGMENT_IDS } from "@/clients/segments";
import { contrastRatio } from "./color";
import {
  formatPhone,
  resolveLink,
  validateBio,
  wifiQrPayload,
  type BioDocument,
  type BlockOf,
} from "./bio";
import { isSafeHref } from "./links";
import { applyQuickEdit, quickEditSchema, quickValuesFrom } from "./quick-edit";
import { createBioDocument } from "./templates";
import { THEME_IDS } from "./themes";

const FULL = briefingSchema.parse({
  businessName: "Forno da Serra",
  tagline: "Pão quentinho todo dia às 6h",
  categories: "Pães, Doces, Salgados",
  city: "Campinas/SP",
  instagram: "@fornodaserra",
  whatsapp: "+55 19 99999-8888",
  googleReviewUrl: "https://g.page/r/abc/review",
  address: "Av. das Andorinhas, 210 — Taquaral",
  mainLinkUrl: "https://cardapio.exemplo.com",
  wifiNetwork: "FORNO-CLIENTES",
  wifiPassword: "pao;quente",
  hours: "Seg a sex | 6h – 20h\nSábado | 6h – 18h",
});

function doc(): BioDocument {
  return createBioDocument({ segment: "food", briefing: FULL });
}

const link = (d: BioDocument, id: string) => d.blocks.find((b) => b.id === id) as BlockOf<"link">;

describe("contraste", () => {
  it("preto e branco = 21", () => expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5));
});

describe("modelos e temas", () => {
  it.each(SEGMENT_IDS.flatMap((s) => THEME_IDS.map((t) => [s, t] as const)))(
    "segmento %s com tema %s gera documento válido (inclui contraste AA)",
    (segment, themeId) => {
      const result = validateBio(createBioDocument({ segment, themeId, briefing: FULL }));
      expect(result.ok ? [] : result.issues).toEqual([]);
    },
  );

  it("funciona só com o nome do negócio", () => {
    const result = validateBio(
      createBioDocument({ segment: "other", briefing: { businessName: "Loja X" } }),
    );
    expect(result.ok ? [] : result.issues).toEqual([]);
  });

  it("ordem: Instagram, Google, ações, Wi-Fi, horários e localização por último", () => {
    expect(doc().blocks.map((b) => b.id)).toEqual([
      "instagram",
      "google",
      "whatsapp",
      "cardapio",
      "wifi",
      "horarios",
      "como-chegar",
    ]);
  });

  it("categorias em maiúsculas, no máximo 6", () => {
    expect(doc().profile.categories).toEqual(["PÃES", "DOCES", "SALGADOS"]);
  });
});

describe("resolveLink", () => {
  it("monta links a partir dos dados de contato", () => {
    const d = doc();
    expect(resolveLink(link(d, "instagram"), d.contact)).toMatchObject({
      href: "https://instagram.com/fornodaserra",
      icon: "instagram",
      subtitle: "@fornodaserra",
    });
    expect(resolveLink(link(d, "whatsapp"), d.contact)?.href).toMatch(
      /^https:\/\/wa\.me\/5519999998888/,
    );
    expect(resolveLink(link(d, "como-chegar"), d.contact)?.href).toBe(
      "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(FULL.address),
    );
  });

  it("mostra a nota do Google quando informada", () => {
    const d = doc();
    d.contact.googleRating = 4.9;
    d.contact.googleReviewCount = 1312;
    expect(resolveLink(link(d, "google"), d.contact)?.subtitle).toBe("4,9 ★ · 1.312 avaliações");
  });

  it("oculta o cartão quando falta o dado", () => {
    const d = doc();
    expect(resolveLink(link(d, "instagram"), {})).toBeNull();
    expect(resolveLink(link(d, "google"), {})).toBeNull();
  });
});

describe("validação de segurança", () => {
  it.each(["javascript:alert(1)", "data:text/html,x", "//x.com", "https://localhost"])(
    "rejeita %s",
    (href) => {
      expect(isSafeHref(href)).toBe(false);
    },
  );

  it("rejeita link inseguro em cartão", () => {
    const d = doc();
    link(d, "cardapio").url = "javascript:alert(1)";
    expect(validateBio(d).ok).toBe(false);
  });

  it("rejeita cores de faixa sem contraste", () => {
    const d = doc();
    d.ticker = { enabled: true, items: ["Oi"], colors: { bg: "#ffffff", fg: "#eeeeee" } };
    const r = validateBio(d);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues[0].message).toMatch(/contraste da faixa/);
  });

  it("faixa ligada exige ao menos uma frase", () => {
    const d = doc();
    d.ticker = { enabled: true, items: [] };
    expect(validateBio(d).ok).toBe(false);
  });

  it("rejeita ids de bloco repetidos", () => {
    const d = doc();
    d.blocks[1].id = d.blocks[0].id;
    expect(validateBio(d).ok).toBe(false);
  });
});

describe("Wi-Fi", () => {
  it("monta o texto do QR escapando caracteres especiais", () => {
    const wifi = doc().blocks.find((b) => b.type === "wifi") as BlockOf<"wifi">;
    expect(wifiQrPayload(wifi)).toBe("WIFI:T:WPA;S:FORNO-CLIENTES;P:pao\\;quente;;");
  });
  it("rede aberta não leva senha", () => {
    const wifi = {
      ...(doc().blocks.find((b) => b.type === "wifi") as BlockOf<"wifi">),
      security: "nopass" as const,
    };
    expect(wifiQrPayload(wifi)).toBe("WIFI:T:nopass;S:FORNO-CLIENTES;;");
  });
});

describe("edição rápida", () => {
  it("ida e volta: valores do documento reaplicados não mudam nada", () => {
    const d = doc();
    expect(applyQuickEdit(d, quickValuesFrom(d))).toEqual(d);
  });

  it("troca Instagram e Wi-Fi e liga a faixa", () => {
    const d = doc();
    const q = quickEditSchema.parse({
      ...quickValuesFrom(d),
      instagram: "https://instagram.com/novo.perfil/",
      wifiNetwork: "NOVA-REDE",
      wifiPassword: "senha123",
      tickerEnabled: true,
      tickerItems: "Promoção de terça\n\nEntrega grátis",
    });
    const next = applyQuickEdit(d, q);
    expect(validateBio(next).ok).toBe(true);
    expect(next.contact.instagram).toBe("novo.perfil");
    expect(next.blocks.find((b) => b.type === "wifi")).toMatchObject({
      network: "NOVA-REDE",
      password: "senha123",
    });
    expect(next.ticker).toEqual({ enabled: true, items: ["Promoção de terça", "Entrega grátis"] });
    expect(d.contact.instagram).toBe("fornodaserra"); // original intacto
  });

  it("apagar a rede remove o bloco de Wi-Fi; criar de novo entra antes da localização", () => {
    const d = doc();
    const sem = applyQuickEdit(d, { ...quickValuesFrom(d), wifiNetwork: "" });
    expect(sem.blocks.some((b) => b.type === "wifi")).toBe(false);
    const com = applyQuickEdit(sem, {
      ...quickValuesFrom(sem),
      wifiNetwork: "REDE",
      wifiPassword: "",
    });
    const ids = com.blocks.map((b) => b.id);
    expect(ids.indexOf("wifi")).toBe(ids.indexOf("como-chegar") - 1);
    expect(com.blocks.find((b) => b.type === "wifi")).toMatchObject({ security: "nopass" });
  });

  it("nota do Google aceita vírgula", () => {
    const q = quickEditSchema.parse({ googleRating: "4,8", googleReviewCount: "312" });
    const next = applyQuickEdit(doc(), q);
    expect(next.contact.googleRating).toBe(4.8);
    expect(next.contact.googleReviewCount).toBe(312);
  });

  it("rejeita horários fora do formato", () => {
    expect(quickEditSchema.safeParse({ hours: "Seg a sex 8h" }).success).toBe(false);
  });
});

describe("utilitários", () => {
  it("parseHours", () => {
    expect(parseHours("Seg a sex | 8h – 18h\n\n Sáb | 9h ")).toEqual([
      { days: "Seg a sex", time: "8h – 18h" },
      { days: "Sáb", time: "9h" },
    ]);
  });
  it("formatPhone", () => {
    expect(formatPhone("5511999998888")).toBe("(11) 99999-8888");
    expect(formatPhone("551133330000")).toBe("(11) 3333-0000");
  });
});
