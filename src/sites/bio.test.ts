import { describe, expect, it } from "vitest";
import {
  briefingSchema,
  instagramField,
  parseHours,
  tiktokField,
  urlField,
  whatsappField,
} from "@/clients/briefing";
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
import {
  BRAND_COLOR_EXCEPTIONS,
  featureColors,
  glossTop,
  ICON_IDS,
  ICONS,
  SECTION_ICONS,
} from "./icons";
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

  it("cadastro antigo com categoria longa ou demais não trava a criação: corta", () => {
    const d = createBioDocument({
      segment: "other",
      briefing: {
        businessName: "Park Vision",
        categories: "Manutenção de brinquedos de parque infantil, A, B, C, D, E, F",
      },
    });
    expect(validateBio(d).ok).toBe(true);
    expect(d.profile.categories).toEqual(["MANUTENÇÃO DE BRINQUEDOS", "A", "B", "C", "D", "E"]);
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
      subtitle: "Siga no Instagram",
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

describe("links colados", () => {
  it("Instagram: link, @perfil ou perfil viram só o perfil", () => {
    for (const v of [
      "https://www.instagram.com/forno.da_serra/",
      "https://instagram.com/forno.da_serra?igsh=MWZ0dTE5",
      "instagram.com/forno.da_serra",
      "@forno.da_serra",
      " forno.da_serra ",
    ])
      expect(instagramField.parse(v)).toBe("forno.da_serra");
  });

  it("TikTok: link com @ ou perfil", () => {
    expect(tiktokField.parse("https://www.tiktok.com/@fornodaserra?lang=pt-BR")).toBe(
      "fornodaserra",
    );
    expect(tiktokField.parse("@fornodaserra")).toBe("fornodaserra");
  });

  it("WhatsApp: links e números em qualquer formato", () => {
    const n = "5519999998888";
    for (const v of [
      "https://wa.me/5519999998888",
      "https://wa.me/5519999998888?text=Ol%C3%A1%2012",
      "https://api.whatsapp.com/send?phone=5519999998888&text=Oi%20123",
      "wa.me/+5519999998888",
      "+55 (19) 99999-8888",
      "(19) 99999-8888",
      "019 99999-8888",
    ])
      expect(whatsappField.parse(v)).toBe(n);
    expect(whatsappField.parse("19 3333-4444")).toBe("551933334444");
    expect(whatsappField.safeParse("12345").success).toBe(false);
  });

  it("link sem https:// ganha o prefixo; texto solto não", () => {
    expect(urlField.parse("g.page/r/abc/review")).toBe("https://g.page/r/abc/review");
    expect(urlField.parse("https://g.page/r/abc")).toBe("https://g.page/r/abc");
    expect(urlField.safeParse("javascript:alert(1)").success).toBe(false);
    expect(urlField.safeParse("meu site").success).toBe(false);
  });
});

describe("cores dos ícones", () => {
  it("cada ícone tem cor própria com desenho branco legível (≥ 3:1), salvo exceções de marca", () => {
    for (const id of ICON_IDS) {
      if (BRAND_COLOR_EXCEPTIONS.includes(id) || id === "google") continue; // Google: fundo branco
      expect(contrastRatio("#ffffff", glossTop(ICONS[id].color)), id).toBeGreaterThanOrEqual(3);
    }
    for (const [id, i] of Object.entries(SECTION_ICONS))
      expect(contrastRatio("#ffffff", glossTop(i.color)), id).toBeGreaterThanOrEqual(3);
  });

  it("cartão em destaque: texto branco legível (≥ 4,5:1) com qualquer cor de ícone", () => {
    for (const color of [...ICON_IDS.map((id) => ICONS[id].color), "#ffffff", "#ffe08a", "#000000"])
      expect(contrastRatio("#ffffff", featureColors(color).top), color).toBeGreaterThanOrEqual(4.5);
  });

  it("cor própria do ícone: aceita cor escura, recusa cor clara (cartão e painéis)", () => {
    const d = doc();
    const insta = link(d, "instagram");
    insta.iconColor = "#1a6fe0";
    expect(validateBio(d).ok).toBe(true);
    insta.iconColor = "#ffe08a";
    const r = validateBio(d);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.some((i) => i.path.endsWith("iconColor"))).toBe(true);

    const d2 = doc();
    const wifi = d2.blocks.find((b) => b.type === "wifi")!;
    Object.assign(wifi, { iconColor: "#f5f5f5" });
    expect(validateBio(d2).ok).toBe(false);
  });
});
