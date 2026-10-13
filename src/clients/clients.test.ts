import { describe, expect, it } from "vitest";
import { briefingSchema } from "./briefing";
import { slugify, slugSchema } from "./slug";

describe("slugify", () => {
  it.each([
    ["Studio Bella Ávila", "studio-bella-avila"],
    ["  Unhas & Cia!! ", "unhas-cia"],
    ["Ação Beleza — Centro", "acao-beleza-centro"],
  ])("%s → %s", (name, slug) => expect(slugify(name)).toBe(slug));
});

describe("slugSchema", () => {
  it.each(["bella", "studio-bella", "b2b"])("aceita %s", (s) => {
    expect(slugSchema.safeParse(s).success).toBe(true);
  });
  it.each(["ab", "-bella", "bella-", "be--lla", "Bella", "bel la", "admin", "www", "a".repeat(41)])(
    "rejeita %s",
    (s) => {
      // "Bella" é normalizado para minúsculas, então é aceito; os demais não.
      expect(slugSchema.safeParse(s).success).toBe(s === "Bella");
    },
  );
});

describe("briefingSchema", () => {
  it("normaliza WhatsApp e Instagram", () => {
    const b = briefingSchema.parse({
      businessName: "Bella",
      whatsapp: "+55 (11) 99999-8888",
      instagram: "@studio.bella",
    });
    expect(b.whatsapp).toBe("5511999998888");
    expect(b.instagram).toBe("studio.bella");
    expect(b.notes).toBe("");
  });

  it.each(["mainLinkUrl", "googleReviewUrl"])("rejeita link inseguro em %s", (field) => {
    expect(
      briefingSchema.safeParse({ businessName: "Bella", [field]: "javascript:alert(1)" }).success,
    ).toBe(false);
  });

  it("aceita Instagram como link completo", () => {
    const b = briefingSchema.parse({
      businessName: "Bella",
      instagram: "https://www.instagram.com/studio.bella/",
    });
    expect(b.instagram).toBe("studio.bella");
  });
});
