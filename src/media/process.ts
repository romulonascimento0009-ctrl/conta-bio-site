import sharp, { type Metadata } from "sharp";

/** Larguras geradas para `srcset`. */
export const VARIANT_WIDTHS = [480, 960, 1600, 2400] as const;
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const MAX_INPUT_PIXELS = 50_000_000;
const ACCEPTED_FORMATS = new Set(["jpeg", "png", "webp", "avif"]);

export class ImageRejected extends Error {}

export type ProcessedImage = {
  width: number;
  height: number;
  variants: { width: number; data: Buffer }[];
};

/**
 * Valida e normaliza uma imagem enviada: confere o formato real pelo conteúdo (não pela extensão),
 * aplica a rotação EXIF e gera variantes WebP. A saída não carrega metadados (EXIF/GPS).
 */
export async function processImage(input: Buffer): Promise<ProcessedImage> {
  if (input.byteLength > MAX_UPLOAD_BYTES) throw new ImageRejected("Imagem maior que 4 MB.");

  let meta: Metadata;
  try {
    meta = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS }).metadata();
  } catch {
    throw new ImageRejected("Arquivo não é uma imagem válida.");
  }
  if (!meta.format || !ACCEPTED_FORMATS.has(meta.format)) {
    throw new ImageRejected("Formato não aceito. Use JPG, PNG, WebP ou AVIF.");
  }
  if (!meta.width || !meta.height) throw new ImageRejected("Imagem sem dimensões.");

  // Orientações EXIF 5–8 giram 90°: largura e altura trocam.
  const rotated = (meta.orientation ?? 1) >= 5;
  const width = rotated ? meta.height : meta.width;
  const height = rotated ? meta.width : meta.height;

  const widths: number[] = VARIANT_WIDTHS.filter((w) => w < width);
  if (widths.length < VARIANT_WIDTHS.length) widths.push(Math.min(width, VARIANT_WIDTHS.at(-1)!));

  const variants = await Promise.all(
    widths.map(async (w) => ({
      width: w,
      data: await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error" })
        .rotate()
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer(),
    })),
  );

  return { width, height, variants };
}

/** Altura proporcional de uma variante. */
export function variantHeight(width: number, height: number, variantWidth: number): number {
  return Math.round((height * variantWidth) / width);
}
