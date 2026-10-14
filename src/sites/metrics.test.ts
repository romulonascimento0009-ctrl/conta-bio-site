import { describe, expect, it } from "vitest";
import { briefingSchema } from "@/clients/briefing";
import { dailyVisitor, eventInputSchema, isBot, trackTargets, visitSource } from "./metrics";
import { applyOperation } from "./operations";
import { createBioDocument } from "./templates";

const HOST = "bio.exemplo.com";

describe("visitSource", () => {
  it("QR e NFC pelo parâmetro, que vence a referência", () => {
    expect(visitSource("qr", "https://l.instagram.com/x", HOST)).toBe("qr");
    expect(visitSource("nfc", undefined, HOST)).toBe("nfc");
  });

  it("parâmetro desconhecido é ignorado", () => {
    expect(visitSource("hack", undefined, HOST)).toBe("direto");
  });

  it("classifica pelo domínio de quem trouxe a visita", () => {
    expect(visitSource(undefined, "https://l.instagram.com/?u=x", HOST)).toBe("instagram");
    expect(visitSource(undefined, "https://www.google.com.br/", HOST)).toBe("google");
    expect(visitSource(undefined, "https://m.facebook.com/", HOST)).toBe("facebook");
    expect(visitSource(undefined, "https://www.tiktok.com/@x", HOST)).toBe("tiktok");
    expect(visitSource(undefined, "https://blog.qualquer.com/post", HOST)).toBe("outro");
  });

  it("sem referência, referência inválida ou o próprio site = direto", () => {
    expect(visitSource(undefined, undefined, HOST)).toBe("direto");
    expect(visitSource(undefined, "não é url", HOST)).toBe("direto");
    expect(visitSource(undefined, `https://${HOST}/outro`, HOST)).toBe("direto");
  });
});

describe("isBot", () => {
  it("robôs, pré-visualizações e ferramentas não contam", () => {
    for (const ua of [
      null,
      "Mozilla/5.0 (compatible; Googlebot/2.1)",
      "facebookexternalhit/1.1",
      "WhatsApp/2.23.20.0",
      "Mozilla/5.0 HeadlessChrome/120",
      "curl/8.0",
    ]) {
      expect(isBot(ua), String(ua)).toBe(true);
    }
  });

  it("navegadores comuns e o navegador do Instagram contam", () => {
    expect(
      isBot(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Instagram 300.0",
      ),
    ).toBe(false);
    expect(isBot("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0 Safari/537.36")).toBe(
      false,
    );
  });
});

describe("trackTargets", () => {
  const doc = createBioDocument({
    segment: "food",
    briefing: briefingSchema.parse({
      businessName: "Forno",
      instagram: "forno",
      whatsapp: "5519999998888",
    }),
  });

  it("aceita só cartões visíveis e com destino, rodapé e botão flutuante", () => {
    const t = trackTargets(doc);
    expect(t.get("b:instagram")).toEqual({ target: "instagram", label: expect.any(String) });
    expect(t.has("fab")).toBe(true);
    expect(t.get("s:tiktok")?.target).toBe("social:tiktok");
    expect(t.has("b:nao-existe")).toBe(false);

    const hidden = applyOperation(doc, { type: "block-toggle", id: "instagram" });
    expect(trackTargets(hidden).has("b:instagram")).toBe(false);
  });
});

describe("eventos", () => {
  it("formato aceito do navegador", () => {
    expect(eventInputSchema.safeParse({ t: "v", s: "forno", o: "qr", r: "" }).success).toBe(true);
    expect(eventInputSchema.safeParse({ t: "x", s: "forno" }).success).toBe(false);
    expect(eventInputSchema.safeParse({ t: "c", s: "a".repeat(41) }).success).toBe(false);
  });

  it("visitante: igual no mesmo dia, diferente no dia seguinte, sem expor o IP", () => {
    const a = dailyVisitor("segredo", "2026-10-13", "203.0.113.9", "UA");
    expect(dailyVisitor("segredo", "2026-10-13", "203.0.113.9", "UA")).toBe(a);
    expect(dailyVisitor("segredo", "2026-10-14", "203.0.113.9", "UA")).not.toBe(a);
    expect(a).toMatch(/^[0-9a-f]{16}$/);
    expect(a).not.toContain("203");
  });
});
