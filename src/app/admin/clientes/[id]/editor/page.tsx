import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listAssets } from "@/data/assets";
import { getClient } from "@/data/clients";
import { getDraft, getSite, hasUnpublishedChanges } from "@/data/sites";
import { publicUrl } from "@/lib/public-url";
import { Editor, type EditorAsset } from "./editor";

export const metadata: Metadata = { title: "Editor visual · PlataformaSites" };

export default async function EditorPage({ params }: PageProps<"/admin/clientes/[id]/editor">) {
  const { id } = await params;
  const client = await getClient(id);
  if (!client) notFound();
  const [site, draft, assets] = await Promise.all([getSite(id), getDraft(id), listAssets(id)]);

  if (!site || !draft) {
    return (
      <p className="text-muted">
        Este cliente ainda não tem Bio Site.{" "}
        <Link href={`/admin/clientes/${id}/site`} className="text-accent underline">
          Criar agora
        </Link>
        .
      </p>
    );
  }

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
      clientId={id}
      initial={draft}
      assets={editorAssets}
      pending={await hasUnpublishedChanges(site)}
      publishedUrl={site.publishedVersionId ? publicUrl(client.slug) : undefined}
    />
  );
}
