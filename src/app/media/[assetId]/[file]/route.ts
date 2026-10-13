import { findAssetVariant, variantKey } from "@/data/assets";
import { storage } from "@/lib/storage";

/**
 * Imagens dos sites: /media/<assetId>/<largura>.webp. Pública (ids aleatórios não adivinháveis);
 * conteúdo imutável por id, então pode ser guardado em cache para sempre.
 */
export async function GET(_req: Request, ctx: RouteContext<"/media/[assetId]/[file]">) {
  const { assetId, file } = await ctx.params;
  const match = /^(\d{2,4})\.webp$/.exec(file);
  if (!match) return new Response(null, { status: 404 });
  const width = Number(match[1]);

  const asset = await findAssetVariant(assetId, width);
  if (!asset) return new Response(null, { status: 404 });
  const data = await storage().get(variantKey(asset.clientId, assetId, width));
  if (!data) return new Response(null, { status: 404 });

  return new Response(Buffer.from(data), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
