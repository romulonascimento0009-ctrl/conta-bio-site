import type { AssetInfo } from "@/data/assets";
import type { VideoInfo } from "@/data/videos";
import type { BioDocument, ImageRef, MediaItem } from "@/sites/bio";
import type { CatalogImage, CatalogMedia } from "./Catalog";
import { mediaUrl, videoUrl } from "./media";

/* Auxiliares de renderização usados pelo Bio Site de cartões e pela Vitrine. */

/** `cartKey`: separa o pedido guardado no navegador por Bio Site (e a prévia do publicado). */
export type Ctx = {
  doc: BioDocument;
  assets: Map<string, AssetInfo>;
  videos: Map<string, VideoInfo>;
  cartKey: string;
  /** Página "Fotos do pedido" do catálogo (só no endereço público). */
  orderBase?: string;
};

export function Img({
  ctx,
  image,
  sizes,
  className,
  priority,
  alt,
}: {
  ctx: Ctx;
  image: ImageRef | undefined;
  sizes: string;
  className?: string;
  priority?: boolean;
  alt?: string;
}) {
  const info = image && ctx.assets.get(image.assetId);
  if (!image || !info) return null;
  const fallback = info.variants.find((w) => w >= 480) ?? info.variants.at(-1)!;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- variantes próprias, sem next/image
    <img
      src={mediaUrl(info.id, fallback)}
      srcSet={info.variants.map((w) => `${mediaUrl(info.id, w)} ${w}w`).join(", ")}
      sizes={sizes}
      width={info.width}
      height={info.height}
      alt={alt ?? image.alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      className={className}
    />
  );
}

/** Variantes de uma imagem do cliente para o catálogo (componente do navegador). */
export function catalogImage(
  ctx: Ctx,
  image: ImageRef | undefined,
  alt: string,
): CatalogImage | null {
  const info = image && ctx.assets.get(image.assetId);
  if (!image || !info) return null;
  const fallback = info.variants.find((w) => w >= 480) ?? info.variants.at(-1)!;
  return {
    src: mediaUrl(info.id, fallback),
    srcSet: info.variants.map((w) => `${mediaUrl(info.id, w)} ${w}w`).join(", "),
    width: info.width,
    height: info.height,
    alt,
  };
}

/** Foto principal + mais fotos e vídeos do produto (vídeos só os prontos, com capa). */
export function productMedia(
  ctx: Ctx,
  main: CatalogImage | null,
  items: MediaItem[] | undefined,
): CatalogMedia[] | undefined {
  if (!items?.length) return undefined;
  const list: CatalogMedia[] = main ? [{ kind: "image", ...main }] : [];
  for (const m of items) {
    if (m.kind === "image") {
      const img = catalogImage(ctx, m, m.alt);
      if (img) list.push({ kind: "image", ...img, caption: m.caption });
    } else {
      const v = ctx.videos.get(m.videoId);
      if (!v) continue;
      const poster = v.posterAssetId ? ctx.assets.get(v.posterAssetId) : undefined;
      const pw = poster && (poster.variants.find((w) => w >= 960) ?? poster.variants.at(-1)!);
      list.push({
        kind: "video",
        src: videoUrl(v.id, v.mime),
        type: v.mime === "video/quicktime" ? "video/mp4" : v.mime,
        poster: poster && pw ? mediaUrl(poster.id, pw) : null,
        width: v.width,
        height: v.height,
        caption: m.caption,
      });
    }
  }
  return list.length > 1 ? list : undefined;
}
