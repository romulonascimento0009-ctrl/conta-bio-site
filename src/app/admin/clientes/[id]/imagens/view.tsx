import { listAssets } from "@/data/assets";
import { mediaUrl } from "@/sites/render/media";
import { AssetCard } from "./asset-card";
import { UploadForm } from "./upload-form";

/** Imagens do cliente. Usada pelo operador (/admin) e pelo próprio cliente (/painel). */
export async function ImagesView({ clientId: id }: { clientId: string }) {
  const assets = await listAssets(id);
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
    </div>
  );
}
