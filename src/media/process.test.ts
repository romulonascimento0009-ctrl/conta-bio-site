import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { ImageRejected, processImage } from "./process";

async function jpeg(width: number, height: number, withExif = false): Promise<Buffer> {
  let img = sharp({
    create: { width, height, channels: 3, background: { r: 200, g: 120, b: 150 } },
  }).jpeg();
  if (withExif) {
    // A orientação precisa de withMetadata; withExif sozinho não a grava.
    img = img.withMetadata({ orientation: 6 }).withExif({ IFD0: { Make: "CameraTeste" } });
  }
  return img.toBuffer();
}

describe("processImage", () => {
  it("gera variantes até a largura original, sem ampliar", async () => {
    const out = await processImage(await jpeg(1200, 800));
    expect(out.width).toBe(1200);
    expect(out.height).toBe(800);
    expect(out.variants.map((v) => v.width)).toEqual([480, 960, 1200]);
    const meta = await sharp(out.variants[0].data).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(480);
  });

  it("imagem pequena gera uma única variante", async () => {
    const out = await processImage(await jpeg(300, 300));
    expect(out.variants.map((v) => v.width)).toEqual([300]);
  });

  it("aplica rotação EXIF e remove metadados", async () => {
    const out = await processImage(await jpeg(1000, 500, true));
    // Orientação 6 = girar 90°: a imagem passa a ser retrato.
    expect(out.width).toBe(500);
    expect(out.height).toBe(1000);
    const meta = await sharp(out.variants.at(-1)!.data).metadata();
    expect(meta.exif).toBeUndefined();
    expect(meta.height).toBeGreaterThan(meta.width!);
  });

  it("rejeita arquivo que não é imagem, mesmo com nome de imagem", async () => {
    await expect(processImage(Buffer.from("<svg onload=alert(1)>"))).rejects.toThrow(ImageRejected);
  });

  it("rejeita SVG e GIF", async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>');
    await expect(processImage(svg)).rejects.toThrow(ImageRejected);
    const gif = await sharp({ create: { width: 10, height: 10, channels: 3, background: "#fff" } })
      .gif()
      .toBuffer();
    await expect(processImage(gif)).rejects.toThrow(ImageRejected);
  });

  it("rejeita arquivo maior que 4 MB", async () => {
    await expect(processImage(Buffer.alloc(4 * 1024 * 1024 + 1))).rejects.toThrow("4 MB");
  });
});
