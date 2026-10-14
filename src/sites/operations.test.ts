import { describe, expect, it } from "vitest";
import { briefingSchema } from "@/clients/briefing";
import { HERO_DEFAULTS, validateBio, type BioDocument } from "./bio";
import { THEME_IDS } from "./themes";
import {
  applyOperation,
  historyApply,
  historyInit,
  historyRedo,
  historyUndo,
  newBlock,
  uniqueBlockId,
} from "./operations";
import { createBioDocument } from "./templates";

function doc(): BioDocument {
  return createBioDocument({
    segment: "food",
    briefing: briefingSchema.parse({
      businessName: "Forno",
      instagram: "forno",
      whatsapp: "5519999998888",
      hours: "Seg | 8h",
      address: "Rua A, 1",
    }),
  });
}

const ids = (d: BioDocument) => d.blocks.map((b) => b.id);

describe("applyOperation", () => {
  it("não altera o documento original", () => {
    const d = doc();
    const before = JSON.stringify(d);
    applyOperation(d, { type: "profile", patch: { name: "Outro" } });
    expect(JSON.stringify(d)).toBe(before);
  });

  it("perfil: altera e remove campos opcionais vazios", () => {
    const d = applyOperation(doc(), { type: "profile", patch: { tagline: "", city: "Campinas" } });
    expect(d.profile.tagline).toBeUndefined();
    expect(d.profile.city).toBe("Campinas");
    expect(validateBio(d).ok).toBe(true);
  });

  it("contato: apagar o Instagram esconde o cartão (dado removido)", () => {
    const d = applyOperation(doc(), { type: "contact", patch: { instagram: undefined } });
    expect(d.contact.instagram).toBeUndefined();
  });

  it("move blocos para cima e para baixo, sem sair dos limites", () => {
    const d = doc();
    const first = ids(d)[0];
    expect(ids(applyOperation(d, { type: "block-move", id: first, delta: -1 }))).toEqual(ids(d));
    const moved = applyOperation(d, { type: "block-move", id: first, delta: 1 });
    expect(ids(moved).slice(0, 2)).toEqual([ids(d)[1], first]);
  });

  it("oculta, remove e adiciona blocos", () => {
    let d = doc();
    d = applyOperation(d, { type: "block-toggle", id: "instagram" });
    expect(d.blocks.find((b) => b.id === "instagram")?.hidden).toBe(true);
    d = applyOperation(d, { type: "block-remove", id: "instagram" });
    expect(ids(d)).not.toContain("instagram");
    const text = newBlock(d, "text")!;
    d = applyOperation(d, { type: "block-add", block: text, afterId: "google" });
    expect(ids(d)[ids(d).indexOf("google") + 1]).toBe(text.id);
    expect(validateBio(d).ok).toBe(true);
  });

  it("tema pronto troca cores e fontes mas mantém o padrão ilustrado", () => {
    const withPattern = applyOperation(doc(), { type: "pattern", pattern: "food" });
    const d = applyOperation(withPattern, { type: "theme-preset", themeId: "oceano" });
    expect(d.theme.colors.cardTop).toBe("#1b56a0");
    expect(d.theme.pattern).toBe("food");
    expect(validateBio(d).ok).toBe(true);
  });

  it("Bio Site novo nasce sem padrão ilustrado", () => {
    expect(doc().theme.pattern).toBe("none");
  });

  it("cor própria do cartão: aplica, valida contraste e volta ao tema", () => {
    let d = applyOperation(doc(), {
      type: "block-update",
      id: "instagram",
      patch: { colors: { top: "#7b2cbf", bottom: "#3c096c" } },
    });
    expect(d.blocks.find((b) => b.id === "instagram")).toMatchObject({
      colors: { top: "#7b2cbf", bottom: "#3c096c" },
    });
    expect(validateBio(d).ok).toBe(true);

    const pale = applyOperation(d, {
      type: "block-update",
      id: "instagram",
      patch: { colors: { top: "#ffe4f0", bottom: "#3c096c" } },
    });
    const r = validateBio(pale);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues[0].path).toMatch(/^blocks\.\d+\.colors\.top$/);

    d = applyOperation(d, { type: "block-update", id: "instagram", patch: { colors: undefined } });
    expect(d.blocks.find((b) => b.id === "instagram")).not.toHaveProperty("colors");
  });

  it("cor do botão do WhatsApp e da faixa padrão", () => {
    let d = applyOperation(doc(), { type: "floating-whatsapp-color", color: "#0b6e4f" });
    expect(d.floatingWhatsappColor).toBe("#0b6e4f");
    expect(validateBio(d).ok).toBe(true);
    // Ícone branco sobre amarelo claro: abaixo de 3:1 (elemento gráfico).
    expect(
      validateBio(applyOperation(d, { type: "floating-whatsapp-color", color: "#ffe066" })).ok,
    ).toBe(false);
    d = applyOperation(d, { type: "floating-whatsapp-color" });
    expect(d).not.toHaveProperty("floatingWhatsappColor");

    d = applyOperation(d, { type: "ticker-theme", patch: { bg: "#111827", fg: "#fde68a" } });
    expect(d.tickerTheme).toEqual({ bg: "#111827", fg: "#fde68a" });
    expect(validateBio(d).ok).toBe(true);
  });

  it("topo: ajustes aplicados por cima do padrão, mantidos na troca de tema e reiniciáveis", () => {
    let d = applyOperation(doc(), { type: "hero", patch: { veilOpacity: 70 } });
    expect(d.theme.hero).toEqual({ ...HERO_DEFAULTS, veilOpacity: 70 });
    d = applyOperation(d, { type: "hero", patch: { blur: 5, logoBorder: "#ffd60a" } });
    expect(d.theme.hero).toMatchObject({ veilOpacity: 70, blur: 5, logoBorder: "#ffd60a" });
    expect(validateBio(d).ok).toBe(true);
    d = applyOperation(d, { type: "theme-preset", themeId: "oceano" });
    expect(d.theme.hero?.veilOpacity).toBe(70);
    d = applyOperation(d, { type: "hero-reset" });
    expect(d.theme).not.toHaveProperty("hero");
  });

  it("topo: texto escuro sobre fundo escuro é recusado; sobre fundo claro, aceito", () => {
    const dark = applyOperation(doc(), { type: "hero", patch: { text: "#1a1a1a" } });
    const r = validateBio(dark);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues[0].path).toBe("theme.hero.text");

    const light = applyOperation(
      applyOperation(dark, {
        type: "theme",
        patch: {
          colors: {
            base: "#fdf6ec",
            glow1: "#fdf6ec",
            glow2: "#fdf6ec",
            glow3: "#fdf6ec",
            accent: "#7a3b00",
          },
        },
      }),
      { type: "hero", patch: { veil: "#ffffff", veilOpacity: 20 } },
    );
    expect(validateBio(light).ok).toBe(true);
  });

  it("topo: todos os temas prontos passam com os ajustes padrão", () => {
    for (const id of THEME_IDS) {
      let d = applyOperation(doc(), { type: "theme-preset", themeId: id });
      d = applyOperation(d, { type: "hero", patch: {} });
      expect(validateBio(d).ok, id).toBe(true);
    }
  });

  it("cor sem contraste é aplicada mas reprovada na validação", () => {
    const d = applyOperation(doc(), { type: "theme", patch: { colors: { cardTop: "#eeeeee" } } });
    const r = validateBio(d);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues[0].path).toBe("theme.colors.cardTop");
  });

  it("todos os blocos novos são válidos", () => {
    const d = doc();
    for (const type of ["link", "wifi", "hours", "text"] as const) {
      const b = newBlock(d, type)!;
      expect(validateBio(applyOperation(d, { type: "block-add", block: b })).ok).toBe(true);
    }
    expect(newBlock(d, "gallery")).toBeNull();
    const g = newBlock(d, "gallery", {
      assetId: "0b6c3f4e-8a51-4c43-9f1e-2d3c4b5a6f70",
      alt: "x",
    })!;
    expect(validateBio(applyOperation(d, { type: "block-add", block: g })).ok).toBe(true);
  });

  it("ids únicos para blocos novos", () => {
    const d = doc();
    expect(uniqueBlockId(d, "instagram")).toBe("instagram-2");
    expect(uniqueBlockId(d, "novo")).toBe("novo");
  });
});

describe("histórico", () => {
  it("desfaz e refaz", () => {
    let h = historyInit(doc());
    h = historyApply(h, { type: "profile", patch: { name: "A" } });
    h = historyApply(h, { type: "profile", patch: { name: "B" } });
    expect(h.present.profile.name).toBe("B");
    h = historyUndo(h);
    expect(h.present.profile.name).toBe("A");
    h = historyUndo(h);
    expect(h.present.profile.name).toBe("Forno");
    h = historyUndo(h);
    expect(h.present.profile.name).toBe("Forno");
    h = historyRedo(h);
    expect(h.present.profile.name).toBe("A");
  });

  it("digitação seguida no mesmo campo vira um só passo", () => {
    let h = historyInit(doc());
    h = historyApply(h, { type: "profile", patch: { name: "F" } }, "profile.name", 1000);
    h = historyApply(h, { type: "profile", patch: { name: "Fo" } }, "profile.name", 1500);
    h = historyApply(h, { type: "profile", patch: { name: "Foo" } }, "profile.name", 2000);
    expect(h.past).toHaveLength(1);
    h = historyApply(h, { type: "profile", patch: { name: "Fooo" } }, "profile.name", 5000);
    expect(h.past).toHaveLength(2);
    h = historyApply(h, { type: "profile", patch: { city: "X" } }, "profile.city", 5100);
    expect(h.past).toHaveLength(3);
    expect(historyUndo(historyUndo(h)).present.profile.name).toBe("Foo");
  });

  it("nova alteração descarta o refazer; operação sem efeito não entra no histórico", () => {
    let h = historyInit(doc());
    h = historyApply(h, { type: "profile", patch: { name: "A" } });
    h = historyUndo(h);
    h = historyApply(h, { type: "profile", patch: { name: "C" } });
    expect(h.future).toEqual([]);
    const same = historyApply(h, { type: "profile", patch: { name: "C" } });
    expect(same).toBe(h);
  });
});
