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
  collectImageRefs,
  glassTop,
  resolveLink,
  splitNameAccent,
  standardCardBase,
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
import { cardSubtitle, isSafeHref } from "./links";
import { pixPayload } from "./pix";
import { applyQuickEdit, quickEditSchema, quickValuesFrom } from "./quick-edit";
import { applyStandardLook, createBioDocument } from "./templates";
import { THEME_IDS, THEMES } from "./themes";

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

  it("não mostra nota nem avaliações do Google, mesmo informadas (pedido do usuário, D41)", () => {
    const d = doc();
    d.contact.googleRating = 4.9;
    d.contact.googleReviewCount = 1312;
    expect(resolveLink(link(d, "google"), d.contact)?.subtitle).toBe("Sua opinião ajuda");
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

  it("link colado no subtítulo do cartão não aparece: vale o texto automático", () => {
    const auto = "Sua opinião ajuda";
    expect(cardSubtitle("https://search.google.com/local/writereview?placeid=X", auto)).toBe(auto);
    expect(cardSubtitle("www.instagram.com/_parkvision/", auto)).toBe(auto);
    expect(cardSubtitle(" https://x.com/a ")).toBeUndefined();
    expect(cardSubtitle("Leva 1 minuto", auto)).toBe("Leva 1 minuto");
    expect(cardSubtitle("", auto)).toBe(auto);
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

  it("vidro na cor de cada ícone: texto branco legível (≥ 4,5:1)", () => {
    for (const id of ICON_IDS)
      expect(contrastRatio("#ffffff", glassTop(ICONS[id].color)), id).toBeGreaterThanOrEqual(4.5);
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

describe("visual padrão (D41: cartões iguais, sem halo, fundo do ramo)", () => {
  it("todo Bio Site novo nasce em vidro neon, sem destaque nem valor à direita", () => {
    for (const segment of SEGMENT_IDS) {
      const d = createBioDocument({ segment, briefing: FULL });
      expect(d.theme.cardStyle, segment).toBe("neon");
      const links = d.blocks.filter((b) => b.type === "link") as BlockOf<"link">[];
      expect(
        links.some((b) => b.featured || b.featureStyle || b.value),
        segment,
      ).toBe(false);
      expect(validateBio(d).ok, segment).toBe(true);
    }
  });

  it("migração: tira destaque, valor e ajustes do futurista; mantém um padrão já escolhido; repetir não muda nada", () => {
    const old = doc();
    old.theme.cardStyle = "glass";
    old.theme.cardTint = "black";
    old.theme.motion = false;
    link(old, "instagram").featured = true;
    link(old, "instagram").featureStyle = "neon";
    link(old, "instagram").value = "12 mil";
    const once = applyStandardLook(old);
    expect(once.theme).toMatchObject({ cardStyle: "neon" });
    expect(once.theme.cardTint).toBeUndefined();
    expect(once.theme.motion).toBeUndefined();
    const insta = link(once, "instagram");
    expect([insta.featured, insta.featureStyle, insta.value]).toEqual([
      undefined,
      undefined,
      undefined,
    ]);
    expect(applyStandardLook(once)).toEqual(once);
    expect(old.theme.cardStyle).toBe("glass"); // original intacto

    const chosen = doc();
    chosen.theme.cardStyle = "tint";
    expect(applyStandardLook(chosen).theme.cardStyle).toBe("tint");
  });

  it("texto branco precisa ser legível na base dos cartões (cor do texto dos painéis)", () => {
    const d = doc();
    d.theme.cardStyle = "dark";
    expect(contrastRatio("#ffffff", standardCardBase(d.theme.colors.ink))).toBeGreaterThanOrEqual(
      4.5,
    );
    expect(validateBio(d).ok).toBe(true);
    for (const id of THEME_IDS) {
      const t = doc();
      t.theme = {
        ...structuredClone(THEMES[id].theme),
        pattern: t.theme.pattern,
        cardStyle: "neon",
      };
      expect(validateBio(t).ok, id).toBe(true);
    }
  });

  it("cor do ícone: cor própria clara demais é recusada no cartão tingido", () => {
    const d = doc();
    d.theme.cardStyle = "tint";
    link(d, "instagram").iconColor = "#0b6e4f";
    expect(validateBio(d).ok).toBe(true);
    link(d, "instagram").iconColor = "#ffe14d";
    const r = validateBio(d);
    expect(r.ok).toBe(false);
  });

  it("galeria em cartão com título e legenda por foto, e fundo da página entram no documento", () => {
    const d = doc();
    const img = "11111111-1111-4111-8111-111111111111";
    const bg = "22222222-2222-4222-8222-222222222222";
    d.profile.pageBackground = { assetId: bg, alt: "" };
    d.blocks.push({
      id: "trabalhos",
      type: "gallery",
      hidden: false,
      title: "Meus trabalhos",
      display: "card",
      subtitle: "Fotos com explicação",
      images: [
        { assetId: img, alt: "Parque", title: "Parque tema praia", caption: "Montagem completa." },
      ],
    });
    d.blocks.push({
      id: "feedback",
      type: "gallery",
      hidden: false,
      title: "Feedback de clientes",
      display: "card",
      hideIcon: true,
      images: [{ assetId: img, alt: "Conversa de cliente agradecendo" }],
    });
    const r = validateBio(d);
    expect(r.ok).toBe(true);
    expect(collectImageRefs(d).map((x) => x.assetId)).toEqual(expect.arrayContaining([img, bg]));

    const long = structuredClone(d);
    (long.blocks.at(-2) as BlockOf<"gallery">).images[0].caption = "x".repeat(241);
    expect(validateBio(long).ok).toBe(false);
  });

  it("cartão só com o nome (sem ícone) é válido", () => {
    const d = doc();
    link(d, "instagram").hideIcon = true;
    expect(validateBio(d).ok).toBe(true);
  });
});

describe("detalhes por cliente no visual padrão (Rota 316, 2026-10-22)", () => {
  const paths = (d: BioDocument) => {
    const r = validateBio(d);
    return r.ok ? [] : r.issues.map((i) => i.path);
  };
  const rota = () => {
    const d = doc();
    d.theme.cardStyle = "neon";
    d.theme.colors.base = "#061a33";
    d.theme.colors.ink = "#061a33";
    return d;
  };

  it("borda neon, categorias, destaque do nome, slogan escuro, reflexo e logo solto: válidos", () => {
    const d = rota();
    d.theme.neonEdges = { start: "#1e6fff", end: "#f5c400" };
    d.theme.chips = { bg: "#f5c400", fg: "#061a33" };
    d.theme.nameAccent = "#f5c400";
    d.theme.taglineDark = true;
    d.theme.shine = true;
    d.theme.effects = "electric";
    d.theme.fonts.display = "exo-2";
    d.profile.logoFrame = "none";
    const r = validateBio(d);
    expect(r.ok ? [] : r.issues).toEqual([]);
  });

  it("recusa categorias sem contraste, destaque do nome apagado e vidro neon claro", () => {
    const chips = rota();
    chips.theme.chips = { bg: "#f5c400", fg: "#ffffff" };
    expect(paths(chips)).toEqual(["theme.chips.fg"]);

    const accent = rota();
    accent.theme.nameAccent = "#0b2a52";
    expect(paths(accent)).toEqual(["theme.nameAccent"]);

    const light = rota();
    light.theme.colors.base = "#5a6f8f";
    light.theme.neonEdges = { start: "#ffffff", end: "#f5c400" };
    expect(paths(light)).toContain("theme.neonEdges.start");
  });

  it("fonte em itálico (Exo 2) só nos títulos", () => {
    const d = rota();
    d.theme.fonts.body = "exo-2";
    expect(paths(d)).toEqual(["theme.fonts.body"]);
  });

  it("efeitos do fundo: só os conhecidos", () => {
    const d = rota();
    Object.assign(d.theme, { effects: "fogos" });
    expect(paths(d)).toEqual(["theme.effects"]);
  });

  it("destaque do nome vai na última palavra", () => {
    expect(splitNameAccent("Rota 316")).toEqual(["Rota ", "316"]);
    expect(splitNameAccent("Studio Lia Andrade")).toEqual(["Studio Lia ", "Andrade"]);
    expect(splitNameAccent("Rota316")).toBeNull();
  });

  it("galeria em cartão aceita ícone próprio (roda para Meus serviços)", () => {
    const d = rota();
    d.blocks.push({
      id: "servicos",
      type: "gallery",
      hidden: false,
      title: "Meus serviços",
      display: "card",
      icon: "wheel",
      images: [{ assetId: "11111111-1111-4111-8111-111111111111", alt: "Alinhamento" }],
    });
    expect(validateBio(d).ok).toBe(true);
    Object.assign(d.blocks.at(-1)!, { icon: "foguete" });
    expect(validateBio(d).ok).toBe(false);
  });
});

describe("cetim, glitter, foto no ícone e banco do Pix (Mage Beauty, 2026-10-24)", () => {
  const paths = (d: BioDocument) => {
    const r = validateBio(d);
    return r.ok ? [] : r.issues.map((i) => i.path);
  };
  const mage = () => {
    const d = doc();
    d.theme.cardStyle = "satin";
    d.theme.colors.base = "#e0c7b1";
    d.theme.colors.ink = "#8a6420";
    d.theme.colors.inkMuted = "#8a6420";
    d.theme.colors.accent = "#5e4310";
    d.theme.neonEdges = { start: "#c99a78", end: "#e9c29e" };
    d.theme.effects = "glitter";
    return d;
  };

  it("cartões cetim com texto dourado, borda clara e glitter: válidos", () => {
    const r = validateBio(mage());
    expect(r.ok ? [] : r.issues).toEqual([]);
  });

  it("recusa texto claro demais sobre o cetim e o nome sumindo no fundo", () => {
    const d = mage();
    d.theme.colors.inkMuted = "#c9a24a";
    expect([...new Set(paths(d))]).toEqual(["theme.colors.inkMuted"]);
    const ink = mage();
    ink.theme.colors.base = "#8f7a66";
    expect(paths(ink)).toContain("theme.colors.ink");
  });

  it("galeria em cartão pode usar a primeira foto como ícone", () => {
    const d = mage();
    d.blocks.push({
      id: "maquiagens",
      type: "gallery",
      hidden: false,
      title: "Maquiagens",
      display: "card",
      iconPhoto: true,
      images: [{ assetId: "11111111-1111-4111-8111-111111111111", alt: "Batom e pincéis" }],
    });
    expect(validateBio(d).ok).toBe(true);
  });

  it("Pix com nome completo do recebedor e banco; o QR corta o nome em 25 letras", () => {
    const d = mage();
    const pix: BlockOf<"pix"> = {
      id: "pix",
      type: "pix",
      hidden: false,
      title: "Pagar com Pix",
      key: "+5585998389076",
      name: "Maria Ingrid Galdino do Nascimento",
      city: "Fortaleza",
      bank: "CloudWalk Meio de Pagamentos",
      showQr: false,
    };
    d.blocks.push(pix);
    expect(validateBio(d).ok).toBe(true);
    expect(pixPayload(pix)).toContain("5925MARIA INGRID GALDINO DO N");
  });
});
