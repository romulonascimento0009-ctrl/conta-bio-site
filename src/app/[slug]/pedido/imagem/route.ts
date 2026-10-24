import sharp from "sharp";
import { findAssetVariant, variantKey } from "@/data/assets";
import { storage } from "@/lib/storage";
import { loadOrder } from "../load";

/**
 * Prévia do link "Fotos do pedido" no WhatsApp (D49): até 4 fotos do pedido numa imagem
 * 1200×630 em JPEG (o WhatsApp não mostra WebP na prévia), sobre a cor de fundo do cliente.
 * Só fotos de produtos do catálogo publicado; sem texto (o servidor não tem fontes).
 */
const W = 1200;
const H = 630;
const GAP = 16;
const PAD = 24;

/**
 * Fotos quadradas (como no catálogo) lado a lado e centralizadas: o produto aparece inteiro,
 * sem corte em faixa.
 */
function tiles(n: number): { left: number; top: number; width: number; height: number }[] {
  const size = Math.floor(Math.min(H - 2 * PAD, (W - 2 * PAD - GAP * (n - 1)) / n));
  const left0 = Math.floor((W - (size * n + GAP * (n - 1))) / 2);
  const top = Math.floor((H - size) / 2);
  return Array.from({ length: n }, (_, i) => ({
    left: left0 + i * (size + GAP),
    top,
    width: size,
    height: size,
  }));
}

export async function GET(req: Request, ctx: RouteContext<"/[slug]/pedido/imagem">) {
  const { slug } = await ctx.params;
  const order = await loadOrder(slug, new URL(req.url).searchParams.get("i") ?? undefined);
  if (!order) return new Response(null, { status: 404 });

  const photos: Buffer[] = [];
  for (const line of order.lines) {
    if (photos.length === 4) break;
    const info = order.site.assets.get(line.prod.image.assetId);
    const width = info && (info.variants.find((w) => w >= 640) ?? info.variants.at(-1));
    const owner = info && width && (await findAssetVariant(info.id, width));
    const data = owner && (await storage().get(variantKey(owner.clientId, info.id, width!)));
    if (data) photos.push(Buffer.from(data));
  }
  if (!photos.length) return new Response(null, { status: 404 });

  const boxes = tiles(photos.length);
  const layers = await Promise.all(
    photos.map(async (p, i) => ({
      input: await sharp(p)
        .resize(Math.round(boxes[i].width), Math.round(boxes[i].height), { fit: "cover" })
        .toBuffer(),
      left: Math.round(boxes[i].left),
      top: Math.round(boxes[i].top),
    })),
  );
  const jpeg = await sharp({
    create: { width: W, height: H, channels: 3, background: order.site.document.theme.colors.base },
  })
    .composite(layers)
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();

  return new Response(new Uint8Array(jpeg), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
