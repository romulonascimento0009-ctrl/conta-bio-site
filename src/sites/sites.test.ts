import { describe, expect, it } from "vitest";
import { contrastRatio } from "./color";
import { bookingHref, collectImageRefs, validateSiteDocument, type SiteDocument } from "./document";
import { isSafeHref } from "./links";
import { createBeautyDocument, THEME_PRESETS, type ThemePresetId } from "./presets";

const ASSET = "0b6c3f4e-8a51-4c43-9f1e-2d3c4b5a6f70";

function baseDoc(presetId: ThemePresetId = "atelie"): SiteDocument {
  return createBeautyDocument({
    presetId,
    contact: { businessName: "Studio Teste", whatsapp: "5511999998888" },
    city: "São Paulo",
  });
}

describe("contrastRatio", () => {
  it("preto e branco = 21", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
  });
  it("cor consigo mesma = 1", () => {
    expect(contrastRatio("#4A2F3A", "#4A2F3A")).toBe(1);
  });
});

describe("isSafeHref", () => {
  it.each([
    "https://agenda.exemplo.com/studio",
    "http://exemplo.com",
    "tel:+5511999998888",
    "mailto:contato@exemplo.com",
  ])("aceita %s", (href) => expect(isSafeHref(href)).toBe(true));

  it.each([
    "javascript:alert(1)",
    "JavaScript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:x",
    "//exemplo.com",
    "https://localhost",
    "ftp://exemplo.com",
    "",
  ])("rejeita %s", (href) => expect(isSafeHref(href)).toBe(false));
});

describe("presets", () => {
  it.each(Object.keys(THEME_PRESETS) as ThemePresetId[])(
    "documento inicial com o tema %s é válido (inclui contraste AA)",
    (presetId) => {
      const result = validateSiteDocument(baseDoc(presetId));
      expect(result.ok ? [] : result.issues).toEqual([]);
    },
  );
});

describe("validateSiteDocument", () => {
  it("rejeita contraste insuficiente", () => {
    const doc = baseDoc();
    doc.theme.colors.muted = "#BBBBBB";
    const result = validateSiteDocument(doc);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues[0].path).toBe("theme.colors.muted");
  });

  it("rejeita link de agendamento inseguro", () => {
    const doc = baseDoc();
    doc.contact.bookingUrl = "javascript:alert(1)";
    expect(validateSiteDocument(doc).ok).toBe(false);
  });

  it("rejeita ids de seção repetidos", () => {
    const doc = baseDoc();
    doc.sections[1].id = doc.sections[0].id;
    const result = validateSiteDocument(doc);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues.some((i) => i.message.includes("id repetido"))).toBe(true);
  });

  it("exige destino para o botão Agendar", () => {
    const doc = baseDoc();
    delete doc.contact.whatsapp;
    expect(validateSiteDocument(doc).ok).toBe(false);
  });

  it("rejeita tipo de seção desconhecido", () => {
    const doc = baseDoc() as unknown as { sections: unknown[] };
    doc.sections.push({ id: "x", type: "carrossel", variant: "a", props: {} });
    expect(validateSiteDocument(doc).ok).toBe(false);
  });

  it("aplica padrões (hidden=false, ctaLabel)", () => {
    const raw = JSON.parse(JSON.stringify(baseDoc()));
    delete raw.sections[0].hidden;
    delete raw.sections[0].props.ctaLabel;
    const result = validateSiteDocument(raw);
    expect(result.ok).toBe(true);
    if (result.ok && result.document.sections[0].type === "hero") {
      expect(result.document.sections[0].hidden).toBe(false);
      expect(result.document.sections[0].props.ctaLabel).toBe("Agendar horário");
    }
  });
});

describe("collectImageRefs e bookingHref", () => {
  it("coleta logo, hero, sobre e galeria", () => {
    const doc = baseDoc();
    doc.contact.logo = { assetId: ASSET, alt: "Logo" };
    doc.sections.push({
      id: "galeria",
      type: "gallery",
      variant: "mosaic",
      hidden: false,
      props: { heading: "Trabalhos", images: [{ assetId: ASSET, alt: "Corte" }] },
    });
    expect(collectImageRefs(doc)).toHaveLength(2);
  });

  it("usa bookingUrl quando existe, senão WhatsApp", () => {
    const doc = baseDoc();
    expect(bookingHref(doc.contact)).toMatch(/^https:\/\/wa\.me\/5511999998888\?text=/);
    doc.contact.bookingUrl = "https://agenda.exemplo.com/x";
    expect(bookingHref(doc.contact)).toBe("https://agenda.exemplo.com/x");
  });
});
