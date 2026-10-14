import type { ReactNode } from "react";
import { listAssets } from "@/data/assets";
import { getClient } from "@/data/clients";
import { getDraft, getSite, hasUnpublishedChanges } from "@/data/sites";
import { publicUrl } from "@/lib/public-url";
import { Editor, type EditorAsset } from "./editor";

/** Editor visual de um cliente. Usado pelo operador (/admin) e pelo próprio cliente (/painel). */
export async function EditorView({ clientId, noSite }: { clientId: string; noSite: ReactNode }) {
  const client = await getClient(clientId);
  if (!client) return null;
  const [site, draft, assets] = await Promise.all([
    getSite(client.id),
    getDraft(client.id),
    listAssets(client.id),
  ]);
  if (!site || !draft) return noSite;

  const editorAssets: EditorAsset[] = assets.map((a) => ({
    id: a.id,
    width: a.width,
    height: a.height,
    variants: a.variants,
    alt: a.alt,
    name: a.originalName,
  }));

  return (
    <Editor
      clientId={client.id}
      initial={draft}
      assets={editorAssets}
      pending={await hasUnpublishedChanges(site)}
      publishedUrl={site.publishedVersionId ? publicUrl(client.slug) : undefined}
    />
  );
}
