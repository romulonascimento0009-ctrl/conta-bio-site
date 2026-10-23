import { describe, expect, it } from "vitest";
import { validateBio } from "./bio";
import { crc16, normalizePixKey, pixPayload } from "./pix";

describe("Pix copia e cola", () => {
  it("CRC16 confere com o exemplo do manual do BR Code", () => {
    expect(crc16("123456789")).toBe("29B1");
    const official =
      "00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-426655440000" +
      "5204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***6304";
    expect(crc16(official)).toBe("1D3D");
  });

  it("monta o texto com chave, recebedor sem acentos e CRC no fim", () => {
    const p = pixPayload({
      key: "contato@rota316.com.br",
      name: "Oficina Mecânica São José",
      city: "Fortaleza",
    });
    expect(p).toContain("0014br.gov.bcb.pix0122contato@rota316.com.br");
    expect(p).toContain("5925OFICINA MECANICA SAO JOSE");
    expect(p).toContain("6009FORTALEZA");
    expect(p.slice(-8, -4)).toBe("6304");
    expect(p.slice(-4)).toBe(crc16(p.slice(0, -4)));
  });

  it("chave: CPF/CNPJ só dígitos, celular com +55, e-mail como veio", () => {
    expect(normalizePixKey("123.456.789-09")).toBe("12345678909");
    expect(normalizePixKey("12.345.678/0001-90")).toBe("12345678000190");
    expect(normalizePixKey("+55 (85) 98405-0265")).toBe("+5585984050265");
    expect(normalizePixKey(" a@b.com ")).toBe("a@b.com");
  });

  it("bloco Pix exige chave, recebedor e cidade", () => {
    const r = validateBio({ blocks: [{ id: "pix", type: "pix", key: "", name: "X", city: "Y" }] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.some((i) => i.path === "blocks.0.key")).toBe(true);
  });
});
