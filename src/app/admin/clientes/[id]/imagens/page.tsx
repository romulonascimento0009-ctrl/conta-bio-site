import type { Metadata } from "next";
import { listAssets } from "@/data/assets";
import { mediaUrl } from "@/sites/render/primitives";
import { AssetCard } from "./asset-card";
import { UploadForm } from "./upload-form";

export const metadata: Metadata = { title: "Imagens · PlataformaSites" };

export default async function ImagesPage({ params }: PageProps<"/admin/clientes/[id]/imagens">) {
  const { id } = await params;
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
