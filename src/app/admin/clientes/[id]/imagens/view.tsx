import { listAssets } from "@/data/assets";
import { listVideos } from "@/data/videos";
import { MAX_VIDEO_MS } from "@/media/video";
import { mediaUrl } from "@/sites/render/media";
import { AssetCard } from "./asset-card";
import { UploadForm } from "./upload-form";
import { VideoCard } from "./video-card";
import { VideoUploadForm } from "./video-upload-form";

/** Imagens do cliente. Usada pelo operador (/admin) e pelo próprio cliente (/painel). */
export async function ImagesView({ clientId: id }: { clientId: string }) {
  const [assets, videos] = await Promise.all([listAssets(id), listVideos(id)]);
  const thumb = (assetId: string | null) => {
    const a = assetId ? assets.find((x) => x.id === assetId) : undefined;
    return a ? mediaUrl(a.id, a.variants[0]) : undefined;
  };
  return (
    <div className="grid gap-10">
      <section aria-labelledby="enviar">
        <h2 id="enviar" className="text-lg font-semibold">
          Enviar imagens
        </h2>
        <p className="mt-1 text-sm text-muted">
          JPG, PNG, WebP ou AVIF. Fotos grandes são reduzidas antes do envio; metadados (incluindo
          localização) são removidos.
        </p>
        <UploadForm clientId={id} />
      </section>
      <section aria-labelledby="enviadas">
        <h2 id="enviadas" className="text-lg font-semibold">
          Imagens enviadas ({assets.length})
        </h2>
        {assets.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Nenhuma imagem ainda.</p>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {assets.map((a) => (
              <li key={a.id}>
                <AssetCard
                  clientId={id}
                  asset={{
                    id: a.id,
                    alt: a.alt,
                    width: a.width,
                    height: a.height,
                    name: a.originalName,
                  }}
                  thumbUrl={mediaUrl(a.id, a.variants[0])}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
      <section aria-labelledby="videos-h">
        <h2 id="videos-h" className="text-lg font-semibold">
          Vídeos ({videos.length})
        </h2>
        <p className="mt-1 text-sm text-muted">
          MP4, MOV ou WebM, até 30 MB e {MAX_VIDEO_MS / 1000} segundos. O vídeo é conferido neste
          navegador antes do envio e ganha uma capa (aparece também nas imagens). Use nos produtos e
          serviços do catálogo (Editor → bloco Catálogo → mais fotos e vídeos).
        </p>
        <VideoUploadForm clientId={id} />
        {videos.length > 0 && (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((v) => (
              <li key={v.id}>
                <VideoCard
                  clientId={id}
                  video={{
                    id: v.id,
                    name: v.originalName,
                    durationMs: v.durationMs,
                    bytes: v.bytes,
                  }}
                  posterUrl={thumb(v.posterAssetId)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
