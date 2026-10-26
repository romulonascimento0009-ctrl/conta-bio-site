import { findAssetVariant, variantKey } from "@/data/assets";
import { findVideoFile, videoPartKey } from "@/data/videos";
import { storage } from "@/lib/storage";
import { parseRange, partsForRange } from "@/media/video";

const IMMUTABLE = "public, max-age=31536000, immutable";

/**
 * Imagens dos sites: /media/<assetId>/<largura>.webp. Vídeos: /media/<videoId>/video.<ext>,
 * servidos aos pedaços (Range). Pública (ids aleatórios não adivinháveis); conteúdo imutável por
 * id, então pode ser guardado em cache para sempre.
 */
export async function GET(req: Request, ctx: RouteContext<"/media/[assetId]/[file]">) {
  const { assetId, file } = await ctx.params;
  if (/^video\.(mp4|mov|webm)$/.test(file)) return serveVideo(req, assetId);
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
      "Cache-Control": IMMUTABLE,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

/**
 * Vídeo: devolve no máximo 2 MB por resposta (o navegador pede o resto em seguida), lendo só as
 * partes guardadas que cobrem o trecho pedido.
 */
async function serveVideo(req: Request, videoId: string): Promise<Response> {
  const video = await findVideoFile(videoId);
  if (!video) return new Response(null, { status: 404 });
  const range = parseRange(req.headers.get("range"), video.bytes);
  if (!range) {
    return new Response(null, {
      status: 416,
      headers: { "Content-Range": `bytes */${video.bytes}` },
    });
  }
  const { first, last, offset } = partsForRange(range.start, range.end);
  const chunks: Uint8Array[] = [];
  for (let i = first; i <= last; i++) {
    const part = await storage().get(videoPartKey(video.clientId, videoId, i));
    if (!part) return new Response(null, { status: 404 });
    chunks.push(part);
  }
  const length = range.end - range.start + 1;
  const body = Buffer.concat(chunks).subarray(offset, offset + length);
  // Sem Range e o vídeo coube inteiro: 200; senão, o trecho (206). O <video> sempre pede Range;
  // quem não pedir recebe o começo como trecho (a resposta inteira passaria do limite da função).
  const whole = !req.headers.get("range") && length === video.bytes;
  return new Response(new Uint8Array(body), {
    status: whole ? 200 : 206,
    headers: {
      "Content-Type": video.mime,
      "Content-Length": String(length),
      "Accept-Ranges": "bytes",
      ...(whole ? {} : { "Content-Range": `bytes ${range.start}-${range.end}/${video.bytes}` }),
      "Cache-Control": IMMUTABLE,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
